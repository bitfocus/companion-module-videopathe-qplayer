export type WindowTarget = 'preview' | 'program'
export type WindowOrActiveTarget = 'active' | WindowTarget
export type MatchType = 'exact' | 'contains' | 'startsWith' | 'endsWith'
export type ComparisonOperator = 'lt' | 'lte' | 'eq' | 'gte' | 'gt'
export type ProgramMode = 'none' | 'black' | 'clock' | 'logo' | 'testcard'
export type MediaType = 'video' | 'image' | 'audio' | 'blank' | 'none'
export type PlayerId = 'p1' | 'p2'
export type PlayerSelection = 'active' | PlayerId
export type LoopMode = 'loop' | 'fade' | 'ping-pong'
export type PlaybackDirection = 'forward' | 'backward'

export interface QPlayerAudioMeter {
	left?: number
	right?: number
	leftPeak?: number
	rightPeak?: number
}

export interface QPlayerWindowMarks {
	inPoint?: number
	outPoint?: number
	duration?: number
	hasMarkIn?: boolean
	hasMarkOut?: boolean
}

export interface QPlayerMediaItem {
	id?: string
	sourceId?: string
	name?: string
	path?: string
	type?: 'video' | 'image' | 'audio' | 'blank'
	duration?: number
	imageDuration?: number
	playbackRate?: number
	markIn?: number
	markOut?: number
	autoNext?: boolean
	disabled?: boolean
	offset?: number
	loops?: number
	loopMode?: LoopMode
	transition?: string
	resolution?: string
	fps?: number
	color?: string
	hasAlpha?: boolean
}

export interface QPlayerPlaylistData {
	id?: string
	name?: string
	items?: QPlayerMediaItem[]
	globalLoop?: boolean
	autoPlay?: boolean
	endOfPlaylistAction?: 'stop' | 'loop' | 'jump' | 'playMedia'
	endOfPlaylistTargetPlaylistId?: string
	endOfPlaylistTargetMediaId?: string
	color?: string
	defaultImageDuration?: number
	defaultFadeDurationMs?: number
}

export interface QPlayerNdiStateSnapshot {
	enabled?: boolean
	sourceName?: string
	resolution?: string
	frameRate?: number
	alphaMode?: string
}

export interface QPlayerOmtStateSnapshot {
	enabled?: boolean
	sourceName?: string
	resolution?: string
	frameRate?: number
	quality?: string
	includeAlpha?: boolean
}

export interface QPlayerStateSnapshot {
	activePlayer?: PlayerId
	dualPlayerEnabled?: boolean
	/** The two gangs. Session-wide: they describe the pair, not one player. */
	dualPlayerSyncTransports?: boolean
	dualPlayerSyncTransitions?: boolean
	spareRole?: 'off' | 'main' | 'spare' | 'backup'
	spareMasterId?: string
	spareMasterName?: string
	spareInstanceId?: string
	spareInstanceName?: string
	playerNames?: Partial<Record<PlayerId, string>>
	players?: Partial<Record<PlayerId, QPlayerStateSnapshot>>
	isPlaying?: boolean
	isPreviewPlaying?: boolean
	isProgramPlaying?: boolean
	currentTime?: number
	duration?: number
	volume?: number
	previewVolume?: number
	programVolume?: number
	repeatEnabled?: boolean
	repeatMode?: LoopMode
	loopCount?: number
	/** Laps of the active playlist when its end action is Loop. */
	playlistLoopCount?: number
	loopLimit?: number
	playbackDirection?: PlaybackDirection
	playbackDirections?: Partial<Record<WindowTarget, PlaybackDirection>>
	shuffleEnabled?: boolean
	activeWindow?: WindowTarget
	markIn?: number
	markOut?: number
	transitionType?: string
	transitionDuration?: number
	isTransitioning?: boolean
	programMode?: string
	previewMedia?: QPlayerMediaItem | null
	programMedia?: QPlayerMediaItem | null
	selectedMedia?: QPlayerMediaItem | null
	windowTimes?: Partial<Record<WindowTarget, number>>
	windowDurations?: Partial<Record<WindowTarget, number>>
	windowMarks?: Partial<Record<WindowTarget, QPlayerWindowMarks>>
	windowPlaybackRates?: Partial<Record<WindowTarget, number>>
	audioMeters?: Partial<Record<WindowTarget, QPlayerAudioMeter>>
	vuThresholds?: {
		yellowDb?: number
		redDb?: number
		preset?: string | null
	}
	/**
	 * The colours the operator set on QPlayer's own remaining-time readout.
	 *
	 * `seconds` reads as a countdown, `percent` as a share of the cue length.
	 * Global to the installation, like the panel that edits them.
	 */
	remainingThresholds?: {
		yellow?: number
		red?: number
		mode?: 'seconds' | 'percent'
	}
	programOffsetCountdownDeadline?: number | null
	playlists?: QPlayerPlaylistData[]
	activePlaylist?: string
	ndi?: QPlayerNdiStateSnapshot
	omt?: QPlayerOmtStateSnapshot
	/**
	 * This Player's extended (fullscreen) output.
	 *
	 * `available` is false when the machine has no spare display to drive, or
	 * when every one it has is already taken by another output.
	 */
	extendedDisplay?: { available?: boolean; open?: boolean; reason?: string | null }
	/** False when this Player's programme output is muted. */
	mainMixEnabled?: boolean
	/** False when this Player's Preview listen is muted. */
	monitoringEnabled?: boolean
}

export interface QPlayerStatusResponse {
	status?: string
	timestamp?: string
	state?: QPlayerStateSnapshot
	network?: {
		ip?: string
		port?: number
		url?: string
	}
}

export interface QPlayerNetworkAddress {
	name?: string
	address?: string
	netmask?: string
	mac?: string
}

export interface QPlayerNetworkInfoResponse {
	success?: boolean
	primaryIP?: string
	allAddresses?: QPlayerNetworkAddress[]
	hostname?: string
	timestamp?: string
	serverPort?: number
	error?: string
}

export interface QPlayerNdiStatus {
	ndiRuntimeAvailable?: boolean
	initialized?: boolean
	running?: boolean
	enabled?: boolean
	sourceName?: string
	resolution?: string
	configuredResolution?: string
	frameRate?: number
	alphaMode?: string
	frameCount?: number
	actualFrameRate?: number
	senderKind?: string | null
	nonBlackConfidence?: number
	error?: string
}

export interface QPlayerOmtStatus {
	available?: boolean
	runtimeAvailable?: boolean
	initialized?: boolean
	running?: boolean
	enabled?: boolean
	sourceName?: string
	resolution?: string
	frameRate?: number
	quality?: string
	includeAlpha?: boolean
	width?: number
	height?: number
	nativePipeline?: boolean
	error?: string
}

export interface MonitorWindowDisplayTarget {
	id?: number
	index?: number | null
	width?: number | null
	height?: number | null
	frequencyHz?: number | null
	extendedType?: string | null
	displayName?: string | null
	modelName?: string | null
}

export interface MonitorWindowTargetStatus {
	success?: boolean
	available?: boolean
	display?: MonitorWindowDisplayTarget | null
	reason?: string | null
	extendedDisplayCount?: number
	reservedDisplayIds?: number[]
	error?: string
}

export interface QPlayerLibraryItem {
	id?: string
	sourceId?: string
	name?: string
	path?: string
	type?: 'video' | 'image' | 'audio'
	duration?: number
	imageDuration?: number
	resolution?: string
	fps?: number
	color?: string
	hasAlpha?: boolean
}

export interface QPlayerLibraryFolder {
	id?: string
	name?: string
	parentId?: string | null
	color?: string
}

export interface QPlayerLibraryItemsResponse {
	success?: boolean
	items?: QPlayerLibraryItem[]
	folders?: QPlayerLibraryFolder[]
	total?: number
	limit?: number
	offset?: number
	error?: string
}

export interface TimeParts {
	hours: number
	minutes: number
	seconds: number
	hoursText: string
	minutesText: string
	secondsText: string
}

export interface MediaLocation {
	playlist: QPlayerPlaylistData
	item: QPlayerMediaItem
	index: number
}

export function safeNumber(value: unknown, fallback = 0): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function safeString(value: unknown, fallback = ''): string {
	return typeof value === 'string' ? value : fallback
}

export function clampNumber(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

export function splitDurationParts(totalSeconds: number): TimeParts {
	const normalized = Math.max(0, Math.floor(safeNumber(totalSeconds)))
	const hours = Math.floor(normalized / 3600)
	const minutes = Math.floor((normalized % 3600) / 60)
	const seconds = normalized % 60

	return {
		hours,
		minutes,
		seconds,
		hoursText: String(hours).padStart(2, '0'),
		minutesText: String(minutes).padStart(2, '0'),
		secondsText: String(seconds).padStart(2, '0'),
	}
}

export function formatDuration(totalSeconds: number, forceHours = false): string {
	const parts = splitDurationParts(totalSeconds)
	if (!forceHours && parts.hours === 0) {
		return `${parts.minutesText}:${parts.secondsText}`
	}

	return `${parts.hoursText}:${parts.minutesText}:${parts.secondsText}`
}

export function compareNumbers(operator: string, actual: number, expected: number): boolean {
	if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
		return false
	}

	switch (operator) {
		case 'lt':
			return actual < expected
		case 'lte':
			return actual <= expected
		case 'eq':
			return actual === expected
		case 'gte':
			return actual >= expected
		case 'gt':
			return actual > expected
		default:
			return false
	}
}

export function compareStrings(matchType: string, actual: string, expected: string): boolean {
	const left = safeString(actual).trim().toLowerCase()
	const right = safeString(expected).trim().toLowerCase()

	if (!right) {
		return left.length === 0
	}

	switch (matchType) {
		case 'contains':
			return left.includes(right)
		case 'startsWith':
			return left.startsWith(right)
		case 'endsWith':
			return left.endsWith(right)
		case 'exact':
		default:
			return left === right
	}
}

/**
 * The Program mode as a button caption.
 *
 * `program_mode` stays the raw API word because feedbacks and conditions
 * compare against it; this is the one meant to be read off a stream deck, so it
 * is upper case and says something for the empty case.
 */
export function programModeLabel(value: unknown): string {
	switch (normalizeProgramMode(value)) {
		case 'black':
			return 'BLACK'
		case 'clock':
			return 'CLOCK'
		case 'logo':
			return 'LOGO'
		case 'testcard':
			return 'TEST'
		default:
			return 'MEDIA'
	}
}

export function normalizeProgramMode(value: unknown): ProgramMode {
	switch (value) {
		case 'black':
		case 'clock':
		case 'logo':
		case 'testcard':
		case 'none':
			return value
		default:
			return 'none'
	}
}

export function getWindowTarget(value: unknown, fallback: WindowTarget = 'program'): WindowTarget {
	return value === 'preview' || value === 'program' ? value : fallback
}

export function getActiveWindow(state: QPlayerStateSnapshot | undefined): WindowTarget {
	return getWindowTarget(state?.activeWindow, 'preview')
}

export function getWindowMedia(
	state: QPlayerStateSnapshot | undefined,
	window: WindowTarget,
): QPlayerMediaItem | undefined {
	const media = window === 'preview' ? state?.previewMedia : state?.programMedia
	return media ?? undefined
}

export function getMediaDisplayName(media: QPlayerMediaItem | null | undefined): string {
	if (!media) {
		return ''
	}

	const name = safeString(media.name).trim()
	if (name) {
		return name
	}

	const rawPath = safeString(media.path).trim()
	if (!rawPath) {
		return ''
	}

	const normalized = rawPath.replace(/\\/g, '/')
	return normalized.split('/').pop() || normalized
}

export function getMediaType(media: QPlayerMediaItem | null | undefined): MediaType {
	if (!media) {
		return 'none'
	}

	switch (media.type) {
		case 'video':
		case 'image':
		case 'audio':
		case 'blank':
			return media.type
		default:
			return 'none'
	}
}

export function getMediaDuration(media: QPlayerMediaItem | null | undefined): number {
	if (!media) {
		return 0
	}

	if (media.type === 'image') {
		const imageDuration = safeNumber(media.imageDuration)
		if (imageDuration > 0) {
			return imageDuration
		}
	}

	return Math.max(0, safeNumber(media.duration))
}

export function getWindowPlaybackRate(state: QPlayerStateSnapshot | undefined, window: WindowTarget): number {
	const media = getWindowMedia(state, window)
	if (!media) {
		return 0
	}

	const rawRate = safeNumber(state?.windowPlaybackRates?.[window], safeNumber(media.playbackRate, 1))
	const direction =
		state?.playbackDirections?.[window] ?? (getActiveWindow(state) === window ? state?.playbackDirection : 'forward')
	return direction === 'backward' ? -Math.abs(rawRate) : Math.abs(rawRate)
}

export function getPlaybackDirection(state: QPlayerStateSnapshot | undefined, window: WindowTarget): PlaybackDirection {
	return (
		state?.playbackDirections?.[window] ??
		(getActiveWindow(state) === window ? state?.playbackDirection : undefined) ??
		'forward'
	)
}

export function getWindowTime(state: QPlayerStateSnapshot | undefined, window: WindowTarget): number {
	const timedValue = safeNumber(state?.windowTimes?.[window], Number.NaN)
	if (Number.isFinite(timedValue)) {
		return Math.max(0, timedValue)
	}

	if (getActiveWindow(state) === window) {
		return Math.max(0, safeNumber(state?.currentTime))
	}

	return 0
}

/**
 * Is this window's transport running?
 *
 * The per-window flags when QPlayer sends them, and the single `isPlaying` for
 * the active window when it does not — the same fallback `getWindowTime` makes
 * for the playhead itself.
 */
export function isWindowPlaying(state: QPlayerStateSnapshot | undefined, window: WindowTarget): boolean {
	const windowFlag = window === 'preview' ? state?.isPreviewPlaying : state?.isProgramPlaying
	if (typeof windowFlag === 'boolean') {
		return windowFlag
	}

	return getActiveWindow(state) === window && state?.isPlaying === true
}

export function getWindowDuration(state: QPlayerStateSnapshot | undefined, window: WindowTarget): number {
	const directDuration = safeNumber(state?.windowDurations?.[window], Number.NaN)
	if (Number.isFinite(directDuration) && directDuration > 0) {
		return directDuration
	}

	if (getActiveWindow(state) === window) {
		const activeDuration = safeNumber(state?.duration, Number.NaN)
		if (Number.isFinite(activeDuration) && activeDuration > 0) {
			return activeDuration
		}
	}

	return getMediaDuration(getWindowMedia(state, window))
}

export function getWindowBounds(
	state: QPlayerStateSnapshot | undefined,
	window: WindowTarget,
): { inPoint: number; outPoint: number; duration: number; hasMarkIn: boolean; hasMarkOut: boolean } {
	const explicit = state?.windowMarks?.[window]
	const media = getWindowMedia(state, window)
	const durationFromApi = safeNumber(explicit?.duration, Number.NaN)
	const duration = Math.max(
		0,
		Number.isFinite(durationFromApi) && durationFromApi > 0 ? durationFromApi : getWindowDuration(state, window),
	)
	const isActive = getActiveWindow(state) === window
	const legacyIn = isActive ? safeNumber(state?.markIn) : 0
	const legacyOut = isActive ? safeNumber(state?.markOut) : 0
	const explicitIn = safeNumber(explicit?.inPoint, Number.NaN)
	const explicitOut = safeNumber(explicit?.outPoint, Number.NaN)
	const rawIn = Number.isFinite(explicitIn) ? explicitIn : safeNumber(media?.markIn, legacyIn)
	const rawOut = Number.isFinite(explicitOut) ? explicitOut : safeNumber(media?.markOut, legacyOut)
	const inPoint = duration > 0 ? clampNumber(rawIn, 0, duration) : Math.max(0, rawIn)
	const outCandidate = rawOut > 0 ? rawOut : duration
	const outPoint =
		duration > 0 ? clampNumber(Math.max(inPoint, outCandidate), inPoint, duration) : Math.max(inPoint, outCandidate)
	return {
		inPoint,
		outPoint,
		duration,
		hasMarkIn: typeof explicit?.hasMarkIn === 'boolean' ? explicit.hasMarkIn : rawIn > 0,
		hasMarkOut: typeof explicit?.hasMarkOut === 'boolean' ? explicit.hasMarkOut : rawOut > 0,
	}
}

export function getWindowRemaining(state: QPlayerStateSnapshot | undefined, window: WindowTarget): number {
	const bounds = getWindowBounds(state, window)
	const cueDuration = Math.max(0, bounds.outPoint - bounds.inPoint)
	if (cueDuration <= 0) {
		return 0
	}

	const time = clampNumber(getWindowTime(state, window), bounds.inPoint, bounds.outPoint)
	const remaining = getPlaybackDirection(state, window) === 'backward' ? time - bounds.inPoint : bounds.outPoint - time
	return clampNumber(remaining, 0, cueDuration) / Math.max(0.0001, Math.abs(getWindowPlaybackRate(state, window) || 1))
}

const WINDOW_TARGETS = ['preview', 'program'] as const

/**
 * How far past its last sample a projected playhead is allowed to run.
 *
 * A ceiling, not a target: while anything at all is arriving the gap stays
 * under a second, and this only matters once nothing is. At that point the
 * readout stops rather than counting down a clip that may well have ended —
 * a frozen number is a visible fault, an invented one is not.
 */
export const MAX_TRANSPORT_PROJECTION_MS = 2000

/**
 * Advance a snapshot's playhead by the time elapsed since it was sampled.
 *
 * The readouts used to show the newest number QPlayer had sent and nothing
 * else, so how smoothly they ran was decided by how regularly that number
 * arrived. It arrives on a 250 ms timer inside a renderer that is also drawing
 * video, and under load that timer slips: two samples 1.2 s apart make a
 * countdown skip from 12 to 10, because the second in between never had a
 * sample to show it.
 *
 * A playing transport is predictable between samples — position plus rate
 * times elapsed — so the gaps are filled here instead of waited out. Each
 * sample still overwrites the projection outright, so this never accumulates
 * error: it only decides what to show until the next authoritative value
 * lands.
 *
 * Bounds are left to the readers. `getWindowRemaining` and
 * `getWindowProgressPercent` already clamp the playhead into the cue, so a
 * projection that runs a moment past the Mark OUT reads as 00:00 there — which
 * is what the end of a cue should read anyway.
 */
export function projectTransportSnapshot(
	state: QPlayerStateSnapshot | undefined,
	elapsedMs: number,
): QPlayerStateSnapshot | undefined {
	if (!state) {
		return state
	}

	const elapsedSeconds = clampNumber(safeNumber(elapsedMs), 0, MAX_TRANSPORT_PROJECTION_MS) / 1000
	if (elapsedSeconds <= 0) {
		return state
	}

	const windowTimes: Partial<Record<WindowTarget, number>> = { ...(state.windowTimes ?? {}) }
	let projected = false

	for (const window of WINDOW_TARGETS) {
		if (!isWindowPlaying(state, window)) {
			continue
		}

		// Signed: the rate already carries the direction of travel.
		const rate = getWindowPlaybackRate(state, window)
		if (!Number.isFinite(rate) || rate === 0) {
			continue
		}

		const time = getWindowTime(state, window)
		const duration = getWindowDuration(state, window)
		const ceiling = duration > 0 ? Math.max(time, duration) : Number.POSITIVE_INFINITY
		const nextTime = clampNumber(time + elapsedSeconds * rate, 0, ceiling)
		if (nextTime === time) {
			continue
		}

		windowTimes[window] = nextTime
		projected = true
	}

	if (!projected) {
		return state
	}

	const activeTime = windowTimes[getActiveWindow(state)]
	return {
		...state,
		windowTimes,
		...(activeTime === undefined ? {} : { currentTime: activeTime }),
	}
}

/** QPlayer's own remaining-time thresholds, defaulted as the interface defaults them. */
export function getRemainingThresholds(state: QPlayerStateSnapshot | undefined): {
	yellow: number
	red: number
	mode: 'seconds' | 'percent'
} {
	const stored = state?.remainingThresholds
	return {
		yellow: Math.max(0, safeNumber(stored?.yellow, 30)),
		red: Math.max(0, safeNumber(stored?.red, 10)),
		mode: stored?.mode === 'percent' ? 'percent' : 'seconds',
	}
}

/**
 * The two thresholds as seconds of remaining time, for one cue.
 *
 * In percent mode the interface measures against the item's whole length, so a
 * button showing a five-minute item turns amber far earlier than one showing a
 * thirty-second sting — which is the point of that mode, and why the length
 * has to be passed in rather than assumed.
 */
export function resolveRemainingThresholdSeconds(
	state: QPlayerStateSnapshot | undefined,
	durationSeconds: number,
): { warnSeconds: number; alertSeconds: number } {
	const { yellow, red, mode } = getRemainingThresholds(state)
	if (mode !== 'percent') {
		return { warnSeconds: yellow, alertSeconds: red }
	}

	const duration = Math.max(0, safeNumber(durationSeconds))
	// A percentage of nothing is nothing, and colouring everything red because
	// the duration has not arrived yet is worse than leaving it green: fall back
	// to reading the numbers as seconds, which is what the interface does.
	if (duration <= 0) {
		return { warnSeconds: yellow, alertSeconds: red }
	}

	return { warnSeconds: (yellow / 100) * duration, alertSeconds: (red / 100) * duration }
}

export function resolvePlayerId(
	state: QPlayerStateSnapshot | undefined,
	selection: PlayerSelection | undefined,
): PlayerId {
	if (selection === 'p1' || selection === 'p2') return selection
	return state?.activePlayer === 'p2' ? 'p2' : 'p1'
}

export function selectPlayerState(
	session: QPlayerStateSnapshot | undefined,
	selection: PlayerSelection | undefined,
): QPlayerStateSnapshot | undefined {
	if (!session) return undefined
	const player = resolvePlayerId(session, selection)
	const playerState = session.players?.[player]
	return {
		...session,
		...(playerState ?? {}),
		activePlayer: player,
		players: session.players,
		playerNames: session.playerNames,
		dualPlayerEnabled: session.dualPlayerEnabled,
		// Session-wide, so they survive the per-player overlay above.
		dualPlayerSyncTransports: session.dualPlayerSyncTransports,
		dualPlayerSyncTransitions: session.dualPlayerSyncTransitions,
	}
}

export function mergeSessionState(
	current: QPlayerStateSnapshot | undefined,
	patch: QPlayerStateSnapshot,
): QPlayerStateSnapshot {
	const previousPlayers = current?.players ?? {}
	const nextPlayers = patch.players ?? {}
	return {
		...(current ?? {}),
		...patch,
		players: {
			...previousPlayers,
			...Object.fromEntries(
				Object.entries(nextPlayers).map(([player, value]) => [
					player,
					{ ...(previousPlayers[player as PlayerId] ?? {}), ...(value ?? {}) },
				]),
			),
		},
	}
}

/**
 * The state keys the WebSocket owns while it is connected.
 *
 * Exactly what QPlayer pushes on `state` / `state-tick` — the transport, and
 * the handful of session facts that travel with it. Everything else in a
 * snapshot (playlists, library, network) only ever arrives over HTTP.
 */
export const WEBSOCKET_OWNED_STATE_KEYS = [
	'players',
	'isPlaying',
	'activePlayer',
	'playerNames',
	'dualPlayerEnabled',
	'dualPlayerSyncTransports',
	'dualPlayerSyncTransitions',
] as const satisfies readonly (keyof QPlayerStateSnapshot)[]

/**
 * Fold a polled HTTP snapshot into the live state without undoing it.
 *
 * The poll used to assign `statusResponse.state` wholesale. That snapshot is
 * taken when the request is *served*, and by the time it lands — eight
 * concurrent requests, JSON, a second of interval — the WebSocket has already
 * delivered newer ticks. Overwriting them walks the playhead backwards once per
 * poll, which on a readout button reads as the number juddering: forward at
 * tick rate, back a step every second, forward again.
 *
 * So while the socket is live it keeps the keys it owns, and the poll supplies
 * the rest. With the socket down the poll is the only source there is and takes
 * the snapshot whole — which is also what makes this safe: nothing is pinned to
 * a stale value once the pusher stops pushing.
 */
export function applyPolledSessionState(
	polled: QPlayerStateSnapshot | undefined,
	live: QPlayerStateSnapshot | undefined,
	webSocketOwnsTransport: boolean,
): QPlayerStateSnapshot | undefined {
	if (!webSocketOwnsTransport || !live) return polled
	if (!polled) return live

	const merged: QPlayerStateSnapshot = { ...polled }
	for (const key of WEBSOCKET_OWNED_STATE_KEYS) {
		if (live[key] !== undefined) {
			;(merged as Record<string, unknown>)[key] = live[key]
		}
	}
	return merged
}

export function getWindowProgressPercent(state: QPlayerStateSnapshot | undefined, window: WindowTarget): number {
	const bounds = getWindowBounds(state, window)
	const cueDuration = bounds.outPoint - bounds.inPoint
	if (cueDuration <= 0) {
		return 0
	}

	const progress = ((getWindowTime(state, window) - bounds.inPoint) / cueDuration) * 100
	return Math.round(clampNumber(progress, 0, 100) * 100) / 100
}

export function getActiveMedia(state: QPlayerStateSnapshot | undefined): QPlayerMediaItem | undefined {
	return getWindowMedia(state, getActiveWindow(state))
}

export function getCueOut(state: QPlayerStateSnapshot | undefined): number {
	return getWindowBounds(state, getActiveWindow(state)).outPoint
}

export function getCueDuration(state: QPlayerStateSnapshot | undefined): number {
	const bounds = getWindowBounds(state, getActiveWindow(state))
	return Math.max(0, bounds.outPoint - bounds.inPoint)
}

export function getCueRemaining(state: QPlayerStateSnapshot | undefined): number {
	return getWindowRemaining(state, getActiveWindow(state))
}

export function getProgramOffsetCountdownSeconds(deadline: unknown, now = Date.now()): number {
	const deadlineMs = safeNumber(deadline)
	if (deadlineMs <= now) {
		return 0
	}

	return Math.ceil((deadlineMs - now) / 1000)
}

export function getActivePlaylist(
	playlists: QPlayerPlaylistData[] | undefined,
	activePlaylistId: unknown,
): QPlayerPlaylistData | undefined {
	const list = Array.isArray(playlists) ? playlists : []
	const activeId = safeString(activePlaylistId).trim()
	if (!activeId) {
		return list[0]
	}

	return list.find((playlist) => safeString(playlist.id) === activeId) ?? list[0]
}

export function getPlaylistIndex(playlists: QPlayerPlaylistData[] | undefined, playlistId: unknown): number {
	const list = Array.isArray(playlists) ? playlists : []
	const targetId = safeString(playlistId).trim()
	if (!targetId) {
		return -1
	}

	return list.findIndex((playlist) => safeString(playlist.id) === targetId)
}

export function findMediaLocation(
	playlists: QPlayerPlaylistData[] | undefined,
	media: QPlayerMediaItem | null | undefined,
): MediaLocation | undefined {
	if (!media) {
		return undefined
	}

	const mediaId = safeString(media.id).trim()
	const sourceId = safeString(media.sourceId).trim()
	const mediaPath = safeString(media.path).trim()
	const list = Array.isArray(playlists) ? playlists : []

	// Search every playlist for an exact ID before considering shared sources.
	for (const match of [
		(item: QPlayerMediaItem) => !!mediaId && safeString(item.id).trim() === mediaId,
		(item: QPlayerMediaItem) => !!sourceId && safeString(item.sourceId).trim() === sourceId,
		(item: QPlayerMediaItem) => !!mediaPath && safeString(item.path).trim() === mediaPath,
	]) {
		for (const playlist of list) {
			const items = Array.isArray(playlist.items) ? playlist.items : []
			const index = items.findIndex((item) => !!item && match(item))
			if (index >= 0) return { playlist, item: items[index], index }
		}
	}

	return undefined
}

export function getAudioMeterValue(
	state: QPlayerStateSnapshot | undefined,
	window: WindowTarget,
	field: keyof QPlayerAudioMeter,
): number {
	return safeNumber(state?.audioMeters?.[window]?.[field])
}

export function buildResolutionText(width: unknown, height: unknown): string {
	const safeWidth = safeNumber(width, Number.NaN)
	const safeHeight = safeNumber(height, Number.NaN)
	if (!Number.isFinite(safeWidth) || !Number.isFinite(safeHeight) || safeWidth <= 0 || safeHeight <= 0) {
		return ''
	}

	return `${Math.round(safeWidth)}x${Math.round(safeHeight)}`
}
