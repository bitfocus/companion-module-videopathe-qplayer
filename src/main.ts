import { AsyncLocalStorage } from 'node:async_hooks'
import {
	InstanceBase,
	InstanceStatus,
	type CompanionVariableValues,
	type SomeCompanionConfigField,
	runEntrypoint,
} from '@companion-module/base'
import WebSocket, { type RawData } from 'ws'
import { fetchJson, postJson, buildBaseUrl } from './api.js'
import { UpdateActions } from './actions.js'
import { DEFAULT_POLL_INTERVAL_MS, GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import {
	type MonitorWindowTargetStatus,
	type QPlayerLibraryItem,
	type QPlayerLibraryItemsResponse,
	type QPlayerNdiStatus,
	type QPlayerNetworkInfoResponse,
	type QPlayerOmtStatus,
	type QPlayerPlaylistData,
	type QPlayerStateSnapshot,
	type QPlayerStatusResponse,
	type PlayerId,
	type PlayerSelection,
	type WindowTarget,
	buildResolutionText,
	getActivePlaylist,
	getActiveWindow,
	getRemainingThresholds,
	getWindowProgressPercent,
	applyPolledSessionState,
	mergeSessionState,
	projectTransportSnapshot,
	resolvePlayerId,
	safeNumber,
	safeString,
	selectPlayerState,
} from './state.js'
import { UpgradeScripts } from './upgrades.js'
import { buildPlayerVariables } from './playerVariables.js'
import { UpdateVariableDefinitions } from './variables.js'

interface RuntimeState {
	connected: boolean
	lastError: string | null
	serverUrl: string
	lastUpdated: string | null
	state?: QPlayerStateSnapshot
	sessionState?: QPlayerStateSnapshot
	network?: QPlayerNetworkInfoResponse
	/** The connection's own Player, for the unprefixed variables and feedbacks. */
	ndi?: QPlayerNdiStatus
	omt?: QPlayerOmtStatus
	/**
	 * Both Players' network outputs.
	 *
	 * NDI and OMT status live behind their own endpoints rather than in the
	 * session state, so a feedback aimed at the other Player has nothing to read
	 * unless both are polled.
	 */
	ndiByPlayer?: Partial<Record<PlayerId, QPlayerNdiStatus>>
	omtByPlayer?: Partial<Record<PlayerId, QPlayerOmtStatus>>
	monitorWindow?: MonitorWindowTargetStatus
	libraryItems?: QPlayerLibraryItem[]
}

/**
 * How long a silent socket keeps ownership of the transport numbers.
 *
 * QPlayer pushes state far faster than this, so the window is only ever reached
 * when the socket has genuinely stopped talking — at which point the poll takes
 * over and the readouts simply refresh once a second instead of continuously.
 */
const WEBSOCKET_STATE_TRUST_MS = 5000

/**
 * How often the readouts are repainted from the projected playhead.
 *
 * Four times a second, so a countdown crosses every whole second with three
 * repaints to spare — enough that a repaint has to be missed three times
 * running before a second goes unshown.
 */
const READOUT_TICK_MS = 250

/**
 * The shortest gap between two repaints.
 *
 * Slightly under the tick so ordinary timer jitter does not make the tick skip
 * its own turn, and enough that a burst of arriving state cannot repaint faster
 * than the tick would on its own. Without it, a live socket and the tick would
 * each repaint at 4 Hz and the panel would do twice the work for a number that
 * only changes once a second.
 */
const READOUT_MIN_REPAINT_GAP_MS = 200

/** Secondary endpoints change much less often than the playback snapshot. */
const AUXILIARY_POLL_INTERVAL_MS = 5000
/** Failed hosts are retried progressively instead of being hammered forever. */
const POLL_RETRY_MIN_MS = 1000
const POLL_RETRY_MAX_MS = 60000
const WEBSOCKET_RECONNECT_MIN_MS = 2000
const WEBSOCKET_RECONNECT_MAX_MS = 60000

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig
	runtimeState: RuntimeState = {
		connected: false,
		lastError: null,
		serverUrl: '',
		lastUpdated: null,
	}

	private pollTimer: NodeJS.Timeout | undefined
	private pollInFlight = false
	private fetchAbortController = new AbortController()
	private consecutivePollFailures = 0
	private pollRetryDelay = POLL_RETRY_MIN_MS
	private lastLoggedPollError: string | null = null
	private auxiliaryPollDueAt = 0
	private failedOptionalEndpoints = new Set<string>()
	private lastStatus: InstanceStatus | undefined
	private lastStatusMessage: string | null | undefined
	/**
	 * When the socket last delivered state.
	 *
	 * The poll consults it to know whether it is the only source of transport
	 * numbers or merely the slower of two. A timestamp rather than a flag: a
	 * socket can be OPEN and silent, and a silent socket owns nothing.
	 */
	private lastWebSocketStateAt = 0
	private websocket: WebSocket | undefined
	private websocketReconnectTimer: NodeJS.Timeout | undefined
	private websocketReconnectDelay = WEBSOCKET_RECONNECT_MIN_MS
	private websocketFailureLogged = false
	private websocketConnected = false
	private dynamicDefinitionsSignature = ''
	private readoutTimer: NodeJS.Timeout | undefined
	/**
	 * When the transport numbers now held in `runtimeState` were true.
	 *
	 * Stamped by whichever source actually supplied them — the socket on every
	 * push, the poll only when the socket is not the one being believed. A poll
	 * that hands the transport straight back to the socket must not re-stamp it,
	 * or the projection would restart from an old position at a new time and the
	 * playhead would stall for as long as the poll kept doing it.
	 */
	private transportSampledAt = 0
	private lastRepaintAt = 0
	/**
	 * The snapshots every reader sees, advanced to the moment of the last
	 * repaint. `runtimeState` keeps the samples themselves, untouched, so each
	 * projection is measured from an authoritative value rather than from the
	 * previous projection.
	 */
	private projectedState: {
		watched?: QPlayerStateSnapshot
		byPlayer: Partial<Record<PlayerId, QPlayerStateSnapshot>>
	} = { byPlayer: {} }

	constructor(internal: unknown) {
		super(internal)
	}

	get isConnected(): boolean {
		return this.runtimeState.connected
	}

	get progressPercent(): number {
		const state = this.watchedState
		const activeWindow = getActiveWindow(state)
		return getWindowProgressPercent(state, activeWindow)
	}

	/** The watched Player's state, playhead included, as of the last repaint. */
	private get watchedState(): QPlayerStateSnapshot | undefined {
		return this.projectedState.watched ?? this.runtimeState.state
	}

	/** One named Player's state, playhead included, as of the last repaint. */
	private getPlayerState(player: PlayerId): QPlayerStateSnapshot | undefined {
		return this.projectedState.byPlayer[player] ?? selectPlayerState(this.runtimeState.sessionState, player)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.repaint()

		this.startPolling(true)
		this.startReadoutTicker()
		// Like QTimer, open the socket only after the HTTP probe succeeds.
	}

	async destroy(): Promise<void> {
		this.fetchAbortController.abort()
		this.pollInFlight = false
		this.stopPolling()
		this.stopReadoutTicker()
		this.disconnectWebSocket(false)
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.fetchAbortController.abort()
		this.disconnectWebSocket(false)
		this.fetchAbortController = new AbortController()
		this.pollInFlight = false
		this.config = config
		this.runtimeState = {
			connected: false,
			lastError: null,
			serverUrl: '',
			lastUpdated: null,
		}
		this.dynamicDefinitionsSignature = ''
		this.transportSampledAt = 0
		this.resetConnectionBackoff()
		this.websocketFailureLogged = false
		this.auxiliaryPollDueAt = 0
		this.failedOptionalEndpoints.clear()
		this.lastStatus = undefined
		this.lastStatusMessage = undefined
		this.repaint()
		this.updateActions()
		this.startPolling(true)
		this.startReadoutTicker()
		// Like QTimer, open the socket only after the HTTP probe succeeds.
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	getPlaylists(): QPlayerPlaylistData[] {
		return Array.isArray(this.runtimeState.state?.playlists) ? (this.runtimeState.state?.playlists ?? []) : []
	}

	getActivePlaylist(): QPlayerPlaylistData | undefined {
		return getActivePlaylist(this.getPlaylists(), this.getCommandState()?.activePlaylist)
	}

	getLibraryItems(): QPlayerLibraryItem[] {
		return Array.isArray(this.runtimeState.libraryItems) ? this.runtimeState.libraryItems : []
	}

	getBaseUrl(): string {
		return buildBaseUrl(this.config.host, safeNumber(this.config.port, 2224))
	}

	getPlayerSelection(): PlayerSelection {
		return this.config.player === 'p1' || this.config.player === 'p2' ? this.config.player : 'active'
	}

	getTargetPlayerId(): PlayerId {
		return resolvePlayerId(this.runtimeState.sessionState ?? this.runtimeState.state, this.getPlayerSelection())
	}

	/**
	 * The Player a single action is aimed at, while its callback runs.
	 *
	 * Async-local rather than a field: two buttons pressed at once each await
	 * their own HTTP round trip, and a shared field would let the second press
	 * redirect the first one's command mid-flight.
	 */
	private readonly actionPlayerOverride = new AsyncLocalStorage<PlayerId>()
	/** Keep every step of a button press bound to the same instance lifecycle. */
	private readonly actionLifecycle = new AsyncLocalStorage<AbortController>()

	/**
	 * Run an action callback aimed at one named Player.
	 *
	 * `run` is entered synchronously inside the storage, so its continuations
	 * inherit the Player across every await in the callback.
	 */
	async runForPlayer<T>(player: PlayerId | undefined, run: () => Promise<T>): Promise<T> {
		return this.actionLifecycle.run(this.actionLifecycle.getStore() ?? this.fetchAbortController, async () =>
			player ? this.actionPlayerOverride.run(player, run) : run(),
		)
	}

	/** Evaluate a feedback against one named Player. Synchronous by nature. */
	evaluateForPlayer<T>(player: PlayerId | undefined, evaluate: () => T): T {
		return player ? this.actionPlayerOverride.run(player, evaluate) : evaluate()
	}

	/** Which Player the command being built right now belongs to. */
	getCommandPlayerId(): PlayerId {
		return this.actionPlayerOverride.getStore() ?? this.getTargetPlayerId()
	}

	/**
	 * State for the Player the running action targets.
	 *
	 * `runtimeState.state` is the connection's own view — the Player it polls,
	 * shows in variables and evaluates feedbacks against. An action aimed
	 * elsewhere has to read that other Player's windows and marks instead, or
	 * "active window" and "seek to percent" would answer for the wrong one.
	 */
	getCommandState(): QPlayerStateSnapshot | undefined {
		const override = this.actionPlayerOverride.getStore()
		if (!override) return this.watchedState
		return this.getPlayerState(override) ?? this.watchedState
	}

	/** NDI status for the Player the running action or feedback targets. */
	getCommandNdi(): QPlayerNdiStatus | undefined {
		const override = this.actionPlayerOverride.getStore()
		return override ? this.runtimeState.ndiByPlayer?.[override] : this.runtimeState.ndi
	}

	/** OMT status for the Player the running action or feedback targets. */
	getCommandOmt(): QPlayerOmtStatus | undefined {
		const override = this.actionPlayerOverride.getStore()
		return override ? this.runtimeState.omtByPlayer?.[override] : this.runtimeState.omt
	}

	private getAuthHeaders(): Record<string, string> {
		const pin = safeString(this.config.apiPin).trim()
		return pin ? { 'X-QPlayer-Pin': pin } : {}
	}

	private isPlayerScopedPath(path: string): boolean {
		return (
			path.startsWith('/api/player/') ||
			path.startsWith('/api/output/') ||
			path.startsWith('/api/ndi/') ||
			path.startsWith('/api/omt/') ||
			path === '/api/library/play' ||
			path === '/api/library/load' ||
			path === '/api/playlist/load-to-preview' ||
			path === '/api/playlist/load-to-program'
		)
	}

	private withTargetPlayer(path: string, body?: unknown): unknown {
		if (!this.isPlayerScopedPath(path)) return body
		const source = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
		return { player: this.getCommandPlayerId(), ...source }
	}

	async ensureWindowSelected(window: WindowTarget): Promise<void> {
		const controller = this.actionLifecycle.getStore() ?? this.fetchAbortController
		if (controller !== this.fetchAbortController || controller.signal.aborted) return
		if (getActiveWindow(this.getCommandState()) === window) {
			return
		}

		await this.postCommand('/api/player/select-window', { window }, { refresh: false })
		if (controller !== this.fetchAbortController || controller.signal.aborted) return

		// The optimistic update belongs to the connection's own view. When the
		// action is aimed at the other Player, that view has not moved and
		// writing to it would show the wrong window until the next poll.
		const targetsWatchedPlayer = this.getCommandPlayerId() === this.getTargetPlayerId()
		if (targetsWatchedPlayer && this.runtimeState.state) {
			this.runtimeState = {
				...this.runtimeState,
				state: {
					...this.runtimeState.state,
					activeWindow: window,
				},
			}
			this.repaint()
		}
	}

	async refreshAllState(): Promise<void> {
		if (this.fetchAbortController.signal.aborted) return
		if (this.pollInFlight) {
			return
		}

		if (!this.hasValidConfig()) {
			this.setStatus(InstanceStatus.BadConfig)
			return
		}

		this.pollInFlight = true
		const requestController = this.fetchAbortController
		const signal = requestController.signal
		const isStale = (): boolean => requestController !== this.fetchAbortController || signal.aborted

		try {
			const baseUrl = this.getBaseUrl()
			const headers = this.getAuthHeaders()
			const targetPlayer = this.getTargetPlayerId()

			// Probe the canonical endpoint first and alone. If the host is absent or
			// misconfigured, seven more requests would only duplicate the same error.
			let statusResponse: QPlayerStatusResponse
			try {
				statusResponse = await fetchJson<QPlayerStatusResponse>(`${baseUrl}/api/status`, { signal, headers })
			} catch (error) {
				if (!isStale()) this.handlePollFailure(error)
				return
			}

			if (isStale()) return

			let networkResponse: QPlayerNetworkInfoResponse | undefined
			let ndiP1: QPlayerNdiStatus | undefined
			let ndiP2: QPlayerNdiStatus | undefined
			let omtP1: QPlayerOmtStatus | undefined
			let omtP2: QPlayerOmtStatus | undefined
			let monitorResponse: MonitorWindowTargetStatus | undefined
			let libraryResponse: QPlayerLibraryItemsResponse | undefined

			if (Date.now() >= this.auxiliaryPollDueAt) {
				this.auxiliaryPollDueAt = Date.now() + AUXILIARY_POLL_INTERVAL_MS
				;[networkResponse, ndiP1, ndiP2, omtP1, omtP2, monitorResponse, libraryResponse] = await Promise.all([
					this.safeFetch<QPlayerNetworkInfoResponse>('Network', `${baseUrl}/api/network-info`, signal, headers),
					this.safeFetch<QPlayerNdiStatus>('NDI P1', `${baseUrl}/api/ndi/status?player=p1`, signal, headers),
					this.safeFetch<QPlayerNdiStatus>('NDI P2', `${baseUrl}/api/ndi/status?player=p2`, signal, headers),
					this.safeFetch<QPlayerOmtStatus>('OMT P1', `${baseUrl}/api/omt/status?player=p1`, signal, headers),
					this.safeFetch<QPlayerOmtStatus>('OMT P2', `${baseUrl}/api/omt/status?player=p2`, signal, headers),
					this.safeFetch<MonitorWindowTargetStatus>(
						'Monitor window',
						`${baseUrl}/api/monitor-window-target`,
						signal,
						headers,
					),
					this.safeFetch<QPlayerLibraryItemsResponse>(
						'Library',
						`${baseUrl}/api/library/items?limit=500&offset=0`,
						signal,
						headers,
					),
				])
				if (isStale()) return
			}
			const ndiResponse = targetPlayer === 'p2' ? ndiP2 : ndiP1
			const omtResponse = targetPlayer === 'p2' ? omtP2 : omtP1

			// Not `statusResponse.state` outright: while the socket is pushing,
			// that snapshot is already stale by the time it lands and would walk
			// the playhead backwards once per poll.
			const webSocketOwnsTransport = this.isWebSocketStateLive()
			const nextSessionState = applyPolledSessionState(
				statusResponse.state,
				this.runtimeState.sessionState,
				webSocketOwnsTransport,
			)
			const nextState = selectPlayerState(nextSessionState, this.getPlayerSelection())
			const nextNetwork = {
				...this.runtimeState.network,
				success: true,
				primaryIP: statusResponse.network?.ip,
				serverPort: statusResponse.network?.port,
				...networkResponse,
			}
			const nextNdi = {
				...this.runtimeState.ndi,
				enabled: nextState?.ndi?.enabled,
				running: nextState?.ndi?.enabled,
				sourceName: nextState?.ndi?.sourceName,
				resolution: nextState?.ndi?.resolution,
				frameRate: nextState?.ndi?.frameRate,
				alphaMode: nextState?.ndi?.alphaMode,
				...ndiResponse,
			}
			const nextOmt = {
				...this.runtimeState.omt,
				enabled: nextState?.omt?.enabled,
				running: nextState?.omt?.enabled,
				sourceName: nextState?.omt?.sourceName,
				resolution: nextState?.omt?.resolution,
				frameRate: nextState?.omt?.frameRate,
				quality: nextState?.omt?.quality,
				includeAlpha: nextState?.omt?.includeAlpha,
				...omtResponse,
			}

			this.runtimeState = {
				connected: true,
				lastError: null,
				serverUrl: statusResponse.network?.url || baseUrl,
				lastUpdated: statusResponse.timestamp || new Date().toISOString(),
				state: nextState,
				sessionState: nextSessionState,
				network: nextNetwork,
				ndi: nextNdi,
				omt: nextOmt,
				ndiByPlayer: {
					p1: ndiP1 ?? this.runtimeState.ndiByPlayer?.p1,
					p2: ndiP2 ?? this.runtimeState.ndiByPlayer?.p2,
				},
				omtByPlayer: {
					p1: omtP1 ?? this.runtimeState.omtByPlayer?.p1,
					p2: omtP2 ?? this.runtimeState.omtByPlayer?.p2,
				},
				monitorWindow: monitorResponse ?? this.runtimeState.monitorWindow,
				libraryItems: Array.isArray(libraryResponse?.items)
					? libraryResponse?.items
					: (this.runtimeState.libraryItems ?? []),
			}

			// Only when this poll is what put the transport there. When the socket
			// kept its keys the numbers are as old as its last push, and dating
			// them from now would freeze the projection for a second at a time.
			if (!webSocketOwnsTransport) {
				this.transportSampledAt = Date.now()
			}

			const wasDisconnected = this.consecutivePollFailures > 0
			this.resetConnectionBackoff()
			this.setStatus(InstanceStatus.Ok)
			if (wasDisconnected) this.log('info', `QPlayer at ${baseUrl} answers again`)
			if (!this.websocket) this.connectWebSocket()
			this.refreshDynamicDefinitions()
			this.repaint()
		} finally {
			if (!isStale()) {
				this.pollInFlight = false
				this.scheduleNextPoll()
			}
		}
	}

	async postCommand(
		path: string,
		body?: unknown,
		options?: { refresh?: boolean; method?: 'POST' | 'PUT' },
	): Promise<void> {
		await this.postCommandForResult(path, body, options)
	}

	async postCommandForResult<T>(
		path: string,
		body?: unknown,
		options?: { refresh?: boolean; method?: 'POST' | 'PUT' },
	): Promise<T | undefined> {
		const requestController = this.actionLifecycle.getStore() ?? this.fetchAbortController
		const signal = requestController.signal
		if (requestController !== this.fetchAbortController || signal.aborted) return undefined
		if (!this.hasValidConfig()) {
			this.setStatus(InstanceStatus.BadConfig)
			throw new Error('Invalid module configuration')
		}

		const baseUrl = this.getBaseUrl()
		try {
			const result = await postJson<T>(
				`${baseUrl}${path}`,
				this.withTargetPlayer(path, body),
				this.getAuthHeaders(),
				signal,
				options?.method ?? 'POST',
			)
			if (requestController !== this.fetchAbortController || signal.aborted) return undefined
			if (options?.refresh !== false) {
				void this.refreshAllState()
			}
			return result
		} catch (error) {
			if (requestController !== this.fetchAbortController || signal.aborted) return undefined
			const message = this.formatError(error)
			this.runtimeState = {
				...this.runtimeState,
				connected: false,
				lastError: message,
			}
			this.setStatus(InstanceStatus.ConnectionFailure, message)
			this.repaint()
			throw error
		}
	}

	async configureWebRtcStream(
		source: 'p1.program' | 'p1.preview' | 'p2.program' | 'p2.preview',
		settings: { enabled: boolean; resolution: string; fps: number; bitrateKbps: number },
	): Promise<void> {
		const controller = this.actionLifecycle.getStore() ?? this.fetchAbortController
		const signal = controller.signal
		if (controller !== this.fetchAbortController || signal.aborted) return
		if (!this.hasValidConfig()) {
			this.setStatus(InstanceStatus.BadConfig)
			throw new Error('Invalid module configuration')
		}
		let response: {
			config?: {
				streams?: Record<string, { enabled?: boolean; resolution?: string; fps?: number; bitrateKbps?: number }>
			}
		}
		try {
			response = await fetchJson<typeof response>(`${this.getBaseUrl()}/api/webrtc/config`, {
				signal,
				headers: this.getAuthHeaders(),
			})
		} catch (error) {
			if (controller !== this.fetchAbortController || signal.aborted) return
			throw error
		}
		if (controller !== this.fetchAbortController || signal.aborted) return
		const streams = { ...(response.config?.streams ?? {}) }
		streams[source] = settings
		await this.postCommand('/api/webrtc/config', { config: { streams } }, { method: 'PUT', refresh: false })
	}

	private hasValidConfig(): boolean {
		const host = typeof this.config?.host === 'string' ? this.config.host.trim() : ''
		const port = safeNumber(this.config?.port)
		if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return false
		try {
			const url = new URL(buildBaseUrl(host, port))
			return !!url.hostname && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash
		} catch {
			return false
		}
	}

	private startPolling(runImmediately: boolean): void {
		this.stopPolling()

		if (!this.hasValidConfig()) {
			this.setStatus(InstanceStatus.BadConfig)
			this.runtimeState = {
				...this.runtimeState,
				connected: false,
				lastError: 'Invalid module configuration',
			}
			this.repaint()
			return
		}

		this.setStatus(InstanceStatus.Connecting)

		if (runImmediately) {
			void this.refreshAllState()
		} else {
			this.scheduleNextPoll()
		}
	}

	private scheduleNextPoll(): void {
		if (this.pollTimer) clearTimeout(this.pollTimer)
		if (this.fetchAbortController.signal.aborted || !this.hasValidConfig()) return
		const configured = Math.max(250, safeNumber(this.config.pollInterval, DEFAULT_POLL_INTERVAL_MS))
		const delay = this.consecutivePollFailures > 0 ? Math.max(configured, this.pollRetryDelay) : configured
		this.pollTimer = setTimeout(() => {
			this.pollTimer = undefined
			void this.refreshAllState()
		}, delay)
	}

	/**
	 * Is the socket currently the better source of transport numbers?
	 *
	 * Open *and* recently heard from. The grace is generous on purpose: falling
	 * back to the poll costs nothing but a slower readout, while treating a live
	 * socket as dead reinstates the judder this exists to remove.
	 */
	private isWebSocketStateLive(): boolean {
		if (this.websocket?.readyState !== WebSocket.OPEN) return false
		if (this.lastWebSocketStateAt <= 0) return false
		return Date.now() - this.lastWebSocketStateAt < WEBSOCKET_STATE_TRUST_MS
	}

	private stopPolling(): void {
		if (this.pollTimer) {
			clearTimeout(this.pollTimer)
			this.pollTimer = undefined
		}
	}

	/**
	 * Keep the readouts moving between arrivals.
	 *
	 * The countdown buttons used to advance only when QPlayer said something,
	 * which made them as regular as the machine sending them: a busy renderer
	 * ticks late, and a countdown told 12 and then 10 shows the operator no 11.
	 * This timer owes nothing to the network — it repaints from the projection,
	 * so the second changes on time whether or not anything arrived to say so.
	 */
	private startReadoutTicker(): void {
		this.stopReadoutTicker()
		this.readoutTimer = setInterval(() => {
			if (Date.now() - this.lastRepaintAt < READOUT_MIN_REPAINT_GAP_MS) {
				return
			}

			this.repaint()
		}, READOUT_TICK_MS)
	}

	private stopReadoutTicker(): void {
		if (this.readoutTimer) {
			clearInterval(this.readoutTimer)
			this.readoutTimer = undefined
		}
	}

	/** Advance the projection to now, then show it. The one way anything repaints. */
	private repaint(): void {
		if (this.fetchAbortController.signal.aborted) return
		const now = Date.now()
		this.lastRepaintAt = now
		const elapsedMs = this.transportSampledAt > 0 ? now - this.transportSampledAt : 0
		this.projectedState = {
			watched: projectTransportSnapshot(this.runtimeState.state, elapsedMs),
			byPlayer: {
				p1: projectTransportSnapshot(selectPlayerState(this.runtimeState.sessionState, 'p1'), elapsedMs),
				p2: projectTransportSnapshot(selectPlayerState(this.runtimeState.sessionState, 'p2'), elapsedMs),
			},
		}

		this.updateVariablesFromState()
		this.checkFeedbacks()
	}

	private disconnectWebSocket(scheduleReconnect: boolean): void {
		if (this.websocketReconnectTimer) {
			clearTimeout(this.websocketReconnectTimer)
			this.websocketReconnectTimer = undefined
		}

		if (this.websocket) {
			const websocket = this.websocket
			this.websocket = undefined
			websocket.removeAllListeners()
			// ws emits an error asynchronously when a CONNECTING socket is
			// terminated. Drain it without logging or reviving this instance.
			websocket.on('error', () => {})
			websocket.terminate()
		}

		// Hand the transport back to the poll immediately rather than after the
		// trust window: a socket we have torn down is not going to speak again.
		this.lastWebSocketStateAt = 0
		this.websocketConnected = false
		this.repaint()

		if (scheduleReconnect && this.hasValidConfig() && this.runtimeState.connected) {
			const delay = this.websocketReconnectDelay
			this.websocketReconnectDelay = Math.min(WEBSOCKET_RECONNECT_MAX_MS, delay * 2)
			this.websocketReconnectTimer = setTimeout(() => {
				this.websocketReconnectTimer = undefined
				this.connectWebSocket()
			}, delay)
		}
	}

	private connectWebSocket(): void {
		if (this.fetchAbortController.signal.aborted) return
		this.disconnectWebSocket(false)

		if (!this.hasValidConfig()) {
			return
		}

		const wsParams = new URLSearchParams({ client: 'companion-module' })
		const apiPin = safeString(this.config.apiPin).trim()
		if (apiPin) wsParams.set('pin', apiPin)
		const wsUrl = `${this.getBaseUrl().replace(/^http:/, 'ws:')}/?${wsParams.toString()}`
		const websocket = new WebSocket(wsUrl, { handshakeTimeout: 10000 })
		this.websocket = websocket

		websocket.on('open', () => {
			if (this.websocket !== websocket) {
				return
			}

			this.websocketConnected = true
			this.websocketReconnectDelay = WEBSOCKET_RECONNECT_MIN_MS
			if (this.websocketFailureLogged) this.log('debug', 'WebSocket connection restored')
			this.websocketFailureLogged = false
			this.log('debug', `WebSocket connected: ws://${this.config.host}:${safeNumber(this.config.port, 2224)}`)
			this.repaint()
			void this.refreshAllState()
		})

		websocket.on('message', (data) => {
			if (this.websocket !== websocket) {
				return
			}

			this.handleWebSocketMessage(this.decodeWebSocketMessage(data))
		})

		websocket.on('close', () => {
			if (this.websocket !== websocket) {
				return
			}

			if (!this.websocketFailureLogged) {
				this.websocketFailureLogged = true
				this.log('debug', 'WebSocket closed; reconnecting with backoff')
			}
			this.disconnectWebSocket(true)
		})

		websocket.on('error', (error) => {
			if (this.websocket !== websocket) {
				return
			}

			const message = this.formatError(error)
			// The HTTP heartbeat owns connection status and outage logging. Socket
			// failures are expected while an app is absent and must not spam logs.
			if (this.runtimeState.connected && !this.websocketFailureLogged) {
				this.websocketFailureLogged = true
				this.log('debug', `WebSocket error: ${message}; suppressed until recovery`)
			}
		})
	}

	private handleWebSocketMessage(message: string): void {
		try {
			const payload = JSON.parse(message) as { type?: string; data?: unknown }

			if (
				(payload.type !== 'state' && payload.type !== 'state-tick') ||
				typeof payload.data !== 'object' ||
				payload.data === null ||
				Array.isArray(payload.data)
			) {
				return
			}

			this.lastWebSocketStateAt = Date.now()
			this.transportSampledAt = this.lastWebSocketStateAt
			const nextSessionState = mergeSessionState(this.runtimeState.sessionState, payload.data as QPlayerStateSnapshot)
			this.runtimeState = {
				...this.runtimeState,
				connected: true,
				lastError: null,
				serverUrl: this.runtimeState.serverUrl || this.getBaseUrl(),
				lastUpdated: new Date().toISOString(),
				sessionState: nextSessionState,
				state: selectPlayerState(nextSessionState, this.getPlayerSelection()),
			}

			this.setStatus(InstanceStatus.Ok)
			this.refreshDynamicDefinitions()
			this.repaint()
		} catch (error) {
			this.log('debug', `WebSocket message parse failed: ${this.formatError(error)}`)
		}
	}

	private refreshDynamicDefinitions(): void {
		const playlistSignature = this.getPlaylists()
			.map((playlist) => {
				const items = Array.isArray(playlist.items) ? playlist.items : []
				return `${safeString(playlist.id)}:${safeString(playlist.name)}:${items
					.map((item) => `${safeString(item.id)}:${safeString(item.name)}`)
					.join(',')}`
			})
			.join('|')
		const librarySignature = this.getLibraryItems()
			.map((item) => `${safeString(item.id)}:${safeString(item.name)}`)
			.join('|')
		const nextSignature = `${playlistSignature}||${librarySignature}`

		if (nextSignature === this.dynamicDefinitionsSignature) {
			return
		}

		this.dynamicDefinitionsSignature = nextSignature
		this.updateActions()
	}

	private async safeFetch<T>(
		label: string,
		url: string,
		signal: AbortSignal,
		headers: Record<string, string>,
	): Promise<T | undefined> {
		const endpoint = new URL(url)
		// P1 and P2 must not clear each other's failure suppression.
		const path = `${endpoint.pathname}${endpoint.search}`
		try {
			const result = await fetchJson<T>(url, { signal, headers })
			if (signal.aborted) return undefined
			this.failedOptionalEndpoints.delete(path)
			return result
		} catch (error) {
			if (signal.aborted) {
				return undefined
			}

			if (!this.failedOptionalEndpoints.has(path)) {
				this.failedOptionalEndpoints.add(path)
				this.log('debug', `${label} refresh failed: ${this.formatError(error)}; suppressed until recovery`)
			}
			return undefined
		}
	}

	private setStatus(status: InstanceStatus, message?: string | null): void {
		const normalized = message ?? null
		if (status === this.lastStatus && normalized === this.lastStatusMessage) return
		this.lastStatus = status
		this.lastStatusMessage = normalized
		this.updateStatus(status, normalized ?? undefined)
	}

	private resetConnectionBackoff(): void {
		this.consecutivePollFailures = 0
		this.pollRetryDelay = POLL_RETRY_MIN_MS
		this.lastLoggedPollError = null
	}

	private handlePollFailure(error: unknown): void {
		const message = this.formatError(error)
		const wasConnected = this.runtimeState.connected
		this.consecutivePollFailures += 1
		this.auxiliaryPollDueAt = 0
		this.failedOptionalEndpoints.clear()
		this.disconnectWebSocket(false)
		this.runtimeState = {
			...this.runtimeState,
			connected: false,
			lastError: message,
			serverUrl: this.getBaseUrl(),
		}
		if (this.consecutivePollFailures === 1) {
			this.lastLoggedPollError = message
			this.log(
				'warn',
				`${wasConnected ? 'Lost' : 'No'} connection to QPlayer at ${this.getBaseUrl()}: ${message}. Retrying with backoff; no further log until recovery.`,
			)
		}
		// Keep one status/log per outage even if the error wording changes.
		this.setStatus(InstanceStatus.ConnectionFailure, this.lastLoggedPollError ?? message)
		this.pollRetryDelay =
			this.consecutivePollFailures === 1 ? POLL_RETRY_MIN_MS : Math.min(POLL_RETRY_MAX_MS, this.pollRetryDelay * 2)
		this.repaint()
	}

	private formatError(error: unknown): string {
		if (error instanceof Error) {
			return error.message
		}

		return String(error)
	}

	private decodeWebSocketMessage(data: RawData): string {
		if (typeof data === 'string') {
			return data
		}

		if (Array.isArray(data)) {
			return Buffer.concat(data.map((chunk) => this.toBuffer(chunk))).toString('utf8')
		}

		return this.toBuffer(data).toString('utf8')
	}

	private toBuffer(data: ArrayBuffer | Buffer | ArrayBufferView): Buffer {
		if (Buffer.isBuffer(data)) {
			return data
		}

		if (ArrayBuffer.isView(data)) {
			return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
		}

		return Buffer.from(new Uint8Array(data))
	}

	private updateVariablesFromState(): void {
		const state = this.watchedState
		const playerId = this.getTargetPlayerId()
		const monitorDisplay = this.runtimeState.monitorWindow?.display ?? null
		const remainingThresholds = getRemainingThresholds(state)

		const values: CompanionVariableValues = {
			connection_status: this.runtimeState.connected
				? 'ok'
				: this.runtimeState.lastError
					? 'connection_failure'
					: 'disconnected',
			websocket_connected: this.websocketConnected,
			server_url: this.runtimeState.serverUrl || (this.hasValidConfig() ? this.getBaseUrl() : ''),
			last_updated: this.runtimeState.lastUpdated ?? '',
			network_primary_ip: this.runtimeState.network?.primaryIP ?? '',
			network_hostname: this.runtimeState.network?.hostname ?? '',
			network_port: safeNumber(this.runtimeState.network?.serverPort, safeNumber(this.config?.port)),
			player_id: playerId,
			player_name: safeString(state?.playerNames?.[playerId], playerId === 'p2' ? 'Player 2' : 'Player 1'),
			dual_player_enabled: state?.dualPlayerEnabled === true,
			link_role: safeString(state?.spareRole, 'off'),
			link_instance_id: safeString(state?.spareInstanceId),
			link_instance_name: safeString(state?.spareInstanceName),
			link_master_id: safeString(state?.spareMasterId),
			link_master_name: safeString(state?.spareMasterName),
			monitor_available: this.runtimeState.monitorWindow?.available === true,
			monitor_display_id: safeNumber(monitorDisplay?.id),
			monitor_display_name: safeString(monitorDisplay?.displayName || monitorDisplay?.modelName),
			monitor_display_resolution: buildResolutionText(monitorDisplay?.width, monitorDisplay?.height),
			remaining_warn_threshold: remainingThresholds.yellow,
			remaining_alert_threshold: remainingThresholds.red,
			remaining_threshold_mode: remainingThresholds.mode,
			...buildPlayerVariables(state, this.runtimeState.ndi, this.runtimeState.omt, this.progressPercent),
		}

		for (const player of ['p1', 'p2'] as const) {
			const playerState = this.getPlayerState(player)
			const playerVariables = buildPlayerVariables(
				playerState,
				this.runtimeState.ndiByPlayer?.[player],
				this.runtimeState.omtByPlayer?.[player],
				// The cached percent belongs to the watched Player; the others are
				// computed from their own state rather than borrowing it.
				player === playerId
					? this.progressPercent
					: getWindowProgressPercent(playerState, getActiveWindow(playerState)),
			)
			for (const [name, value] of Object.entries(playerVariables)) {
				values[`${player}_${name}`] = value
			}
			values[`${player}_player_name`] = safeString(
				state?.playerNames?.[player],
				player === 'p2' ? 'Player 2' : 'Player 1',
			)
		}

		this.setVariableValues(values)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
