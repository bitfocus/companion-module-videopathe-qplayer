import { variableOptionIds, resolveVariableOptions } from './optionVariables.js'
import type { CompanionActionDefinitions, SomeCompanionActionInputField } from '@companion-module/base'
import {
	ACTION_PLAYER_CHOICES,
	ON_OFF_CHOICES,
	LOOP_ITEM_MODE_CHOICES,
	MONITOR_WINDOW_ACTION_CHOICES,
	MUTE_TARGET_CHOICES,
	LOOP_MODE_CHOICES,
	OMT_QUALITY_CHOICES,
	PLAYER_CHOICES,
	PLAYLIST_END_ACTION_CHOICES,
	TOGGLE_CHOICES,
	TRANSITION_CHOICES,
	VOLUME_TARGET_CHOICES,
	WINDOW_SELECT_CHOICES,
	WINDOW_WITH_ACTIVE_CHOICES,
} from './choices.js'
import type { ModuleInstance } from './main.js'
import { getActiveWindow, getWindowDuration, getWindowTime, type WindowTarget } from './state.js'

const ACTIVE_PLAYLIST_CHOICE = '__active_playlist__'

function toggleChoiceToPayload(choice: unknown): boolean | undefined {
	switch (choice) {
		case 'on':
			return true
		case 'off':
			return false
		default:
			return undefined
	}
}

function onOffChoiceToBoolean(choice: unknown): boolean {
	return choice === 'on'
}

function colorToHex(value: unknown, fallback = 0xffffff): string {
	const numeric = Number.isFinite(Number(value)) ? Number(value) : fallback
	const bounded = Math.max(0, Math.min(0xffffff, Math.round(numeric)))
	return `#${bounded.toString(16).padStart(6, '0')}`.toUpperCase()
}

function truncateLabel(value: string, maxLength = 56): string {
	return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

function encodePlaylistMediaChoice(playlistId: string, mediaId: string): string {
	return JSON.stringify({ playlistId, mediaId })
}

function decodePlaylistMediaChoice(value: unknown): { playlistId: string; mediaId: string } | undefined {
	if (typeof value !== 'string' || !value.trim()) {
		return undefined
	}

	try {
		const parsed = JSON.parse(value) as { playlistId?: unknown; mediaId?: unknown }
		const playlistId = typeof parsed.playlistId === 'string' ? parsed.playlistId.trim() : ''
		const mediaId = typeof parsed.mediaId === 'string' ? parsed.mediaId.trim() : ''
		if (!mediaId) {
			return undefined
		}

		return { playlistId, mediaId }
	} catch {
		return undefined
	}
}

function getPlaylistChoices(self: ModuleInstance): Array<{ id: string; label: string }> {
	const playlists = self.getPlaylists()
	const activePlaylist = self.getActivePlaylist()
	const choices: Array<{ id: string; label: string }> = [
		{
			id: ACTIVE_PLAYLIST_CHOICE,
			label: activePlaylist ? `Active playlist (${activePlaylist.name || activePlaylist.id})` : 'Active playlist',
		},
	]

	for (const playlist of playlists) {
		const playlistId = String(playlist.id || '').trim()
		if (!playlistId) {
			continue
		}

		const name = String(playlist.name || playlistId)
		choices.push({ id: playlistId, label: truncateLabel(name) })
	}

	return choices
}

function getPlaylistMediaChoices(self: ModuleInstance): Array<{ id: string; label: string }> {
	const choices: Array<{ id: string; label: string }> = [{ id: '', label: 'Manual playlist/media IDs' }]

	for (const playlist of self.getPlaylists()) {
		const playlistId = String(playlist.id || '').trim()
		const playlistName = String(playlist.name || playlistId || 'Playlist').trim() || 'Playlist'
		const items = Array.isArray(playlist.items) ? playlist.items : []

		for (const item of items) {
			const mediaId = String(item.id || '').trim()
			if (!mediaId) {
				continue
			}

			const mediaName = String(item.name || item.path || mediaId).trim() || mediaId
			choices.push({
				id: encodePlaylistMediaChoice(playlistId, mediaId),
				label: truncateLabel(`${playlistName} :: ${mediaName}`),
			})
		}
	}

	return choices
}

function getLibraryChoices(self: ModuleInstance): Array<{ id: string; label: string }> {
	const choices: Array<{ id: string; label: string }> = [{ id: '', label: 'Manual library ID / path' }]

	for (const item of self.getLibraryItems()) {
		const itemId = String(item.id || '').trim()
		if (!itemId) {
			continue
		}

		const itemName = String(item.name || item.path || itemId).trim() || itemId
		choices.push({ id: itemId, label: truncateLabel(itemName) })
	}

	return choices
}

function resolvePlaylistId(self: ModuleInstance, choice: unknown, manualId: unknown): string {
	const manual = typeof manualId === 'string' ? manualId.trim() : ''
	if (manual) {
		return manual
	}

	const selected = typeof choice === 'string' ? choice.trim() : ''
	if (!selected || selected === ACTIVE_PLAYLIST_CHOICE) {
		return String(self.getActivePlaylist()?.id || '').trim()
	}

	return selected
}

function resolvePlaylistMediaSelection(
	self: ModuleInstance,
	choice: unknown,
	manualPlaylistId: unknown,
	manualMediaId: unknown,
): { playlistId?: string; mediaId?: string } {
	const decoded = decodePlaylistMediaChoice(choice)
	const playlistOverride = typeof manualPlaylistId === 'string' ? manualPlaylistId.trim() : ''
	const mediaOverride = typeof manualMediaId === 'string' ? manualMediaId.trim() : ''
	return {
		playlistId:
			playlistOverride || decoded?.playlistId || resolvePlaylistId(self, ACTIVE_PLAYLIST_CHOICE, '') || undefined,
		mediaId: mediaOverride || decoded?.mediaId || undefined,
	}
}

function resolveLibrarySelection(
	choice: unknown,
	manualId: unknown,
	manualPath: unknown,
): { id?: string; path?: string } {
	const selectedId = typeof choice === 'string' ? choice.trim() : ''
	const overrideId = typeof manualId === 'string' ? manualId.trim() : ''
	const id = overrideId || selectedId
	const path = typeof manualPath === 'string' ? manualPath.trim() : ''

	return {
		id: overrideId || (path ? undefined : id || undefined),
		path: path || undefined,
	}
}

function resolveActionWindow(self: ModuleInstance, choice: unknown): WindowTarget {
	const selected = typeof choice === 'string' ? choice : 'active'
	if (selected === 'preview' || selected === 'program') {
		return selected
	}

	// The targeted Player's active window, which is not the connection's own
	// once the action names the other Player.
	return getActiveWindow(self.getCommandState())
}

async function runWindowCommand(
	self: ModuleInstance,
	windowChoice: unknown,
	path: string,
	body?: unknown,
): Promise<void> {
	const targetWindow = resolveActionWindow(self, windowChoice)
	await self.ensureWindowSelected(targetWindow)
	await self.postCommand(path, body)
}

function getWindowDurationForAction(self: ModuleInstance, choice: unknown): number {
	return getWindowDuration(self.getCommandState(), resolveActionWindow(self, choice))
}

function getWindowCurrentTimeForAction(self: ModuleInstance, choice: unknown): number {
	return getWindowTime(self.getCommandState(), resolveActionWindow(self, choice))
}

/**
 * Actions that address one Player's channel rather than the whole application.
 *
 * Kept in step with ModuleInstance.isPlayerScopedPath — an action listed here
 * without a Player-scoped path would show a dropdown that changes nothing, and
 * one omitted from here can only ever reach the connection's own Player.
 */
const PLAYER_SCOPED_ACTION_IDS = new Set([
	'player_play',
	'player_pause',
	'player_stop',
	'player_seek_seconds',
	'player_seek_percent',
	'player_seek_relative',
	'player_goto_remaining',
	'player_set_volume',
	'player_set_playback_rate',
	'player_next',
	'player_previous',
	'player_select_window',
	'player_toggle_extended',
	'screenshot_preview',
	'screenshot_program',
	'player_take',
	'player_cut',
	'player_fade',
	'player_fade_to_alpha',
	'player_set_transition',
	'player_eject',
	'player_mark_in',
	'player_mark_out',
	'player_clear_marks',
	'player_goto_mark_in',
	'player_goto_mark_out',
	'player_set_repeat',
	'player_set_mute',
	'player_set_shuffle',
	'player_play_index',
	'player_load_index',
	'player_play_playlist',
	'player_play_media',
	'player_load_media',
	'player_load_program',
	'library_play_item',
	'library_load_item',
	'output_black',
	'output_clock',
	'output_logo',
	'output_pattern',
	'ndi_initialize',
	'ndi_start',
	'ndi_stop',
	'omt_initialize',
	'omt_start',
	'omt_stop',
])

const PLAYER_TARGET_OPTION = {
	id: 'player',
	type: 'dropdown',
	label: 'Target Player',
	default: 'active',
	choices: [...ACTION_PLAYER_CHOICES],
} as const satisfies SomeCompanionActionInputField

/**
 * Bind every action to its lifecycle; give Player-scoped actions a Player dropdown.
 *
 * Applied as a wrapper rather than written into each definition so the option
 * and the routing are stated once: forty-odd actions each repeating the same
 * dropdown and the same body key is how they drift apart.
 */
function applyPlayerTargeting(self: ModuleInstance, definitions: CompanionActionDefinitions): void {
	for (const [actionId, definition] of Object.entries(definitions)) {
		if (!definition) continue
		const playerScoped = PLAYER_SCOPED_ACTION_IDS.has(actionId)
		const inner = definition.callback.bind(definition)
		if (playerScoped) definition.options = [...definition.options, { ...PLAYER_TARGET_OPTION }]
		definition.callback = async (event, context) => {
			// Global actions need the lifecycle guard too, but must not acquire
			// an unrelated Player target or reinterpret their own options.
			const choice = playerScoped ? event.options.player : undefined
			// 'active' defers to the connection, whose own default is likewise the
			// Player QPlayer is currently driving.
			const player = choice === 'p1' || choice === 'p2' ? choice : undefined
			return self.runForPlayer(player, async () => {
				const ids = variableOptionIds(definition.options, event.options)
				const options = await resolveVariableOptions(event.options, ids, context)
				return inner({ ...event, options }, context)
			})
		}
	}
}

export function UpdateActions(self: ModuleInstance): void {
	const definitions: CompanionActionDefinitions = {
		refresh_state: {
			name: 'Refresh QPlayer state now',
			options: [],
			callback: async () => {
				await self.refreshAllState()
			},
		},
		player_select_player: {
			name: 'Player: Select controlled Player',
			options: [{ id: 'player', type: 'dropdown', label: 'Player', default: 'p1', choices: [...PLAYER_CHOICES] }],
			callback: async (event) => self.postCommand('/api/player/select-player', { player: event.options.player }),
		},
		player_play: {
			name: 'Player: Play',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
			],
			callback: async (event) => runWindowCommand(self, event.options.window, '/api/player/play'),
		},
		player_pause: {
			name: 'Player: Pause',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
			],
			callback: async (event) => runWindowCommand(self, event.options.window, '/api/player/pause'),
		},
		player_stop: {
			name: 'Player: Stop',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
			],
			callback: async (event) => runWindowCommand(self, event.options.window, '/api/player/stop'),
		},
		player_seek_seconds: {
			name: 'Player: Seek to time',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'time', type: 'number', label: 'Time (seconds)', default: 0, min: 0, max: 86400 },
			],
			callback: async (event) =>
				runWindowCommand(self, event.options.window, '/api/player/seek', {
					time: Math.max(0, Number(event.options.time)),
				}),
		},
		player_seek_percent: {
			name: 'Player: Seek to percent',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'percent', type: 'number', label: 'Percent', default: 50, min: 0, max: 100 },
			],
			callback: async (event) => {
				const duration = getWindowDurationForAction(self, event.options.window)
				if (duration <= 0) {
					self.log('warn', 'player_seek_percent: no duration available for the selected window')
					return
				}

				const percent = Math.max(0, Math.min(100, Number(event.options.percent)))
				await runWindowCommand(self, event.options.window, '/api/player/seek', { time: (duration * percent) / 100 })
			},
		},
		player_seek_relative: {
			name: 'Player: Seek relative',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'delta', type: 'number', label: 'Delta (seconds)', default: 5, min: -86400, max: 86400 },
			],
			callback: async (event) => {
				const duration = getWindowDurationForAction(self, event.options.window)
				const currentTime = getWindowCurrentTimeForAction(self, event.options.window)
				const delta = Number(event.options.delta)
				const nextTime =
					duration > 0 ? Math.max(0, Math.min(duration, currentTime + delta)) : Math.max(0, currentTime + delta)
				await runWindowCommand(self, event.options.window, '/api/player/seek', { time: nextTime })
			},
		},
		player_goto_remaining: {
			name: 'Player: Go to remaining time',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'time', type: 'number', label: 'Remaining time (seconds)', default: 10, min: 0, max: 86400 },
			],
			callback: async (event) =>
				runWindowCommand(self, event.options.window, '/api/player/goto', {
					time: Math.max(0, Number(event.options.time)),
				}),
		},
		player_set_volume: {
			name: 'Player: Set volume',
			options: [
				{
					id: 'target',
					type: 'dropdown',
					label: 'Volume target',
					default: 'program',
					choices: [...VOLUME_TARGET_CHOICES],
				},
				{ id: 'volume', type: 'number', label: 'Volume percent', default: 80, min: 0, max: 100 },
			],
			callback: async (event) => {
				const target = String(event.options.target || 'program')
				const volume = Math.max(0, Math.min(100, Number(event.options.volume)))
				await self.postCommand('/api/player/volume', {
					volume,
					...(target === 'preview' || target === 'program' ? { window: target } : {}),
				})
			},
		},
		player_set_playback_rate: {
			name: 'Player: Set playback rate',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'program',
					choices: [
						{ id: 'preview', label: 'Preview' },
						{ id: 'program', label: 'Program' },
					],
				},
				{ id: 'rate', type: 'number', label: 'Playback rate', default: 1, min: 0.25, max: 10, step: 0.25 },
			],
			callback: async (event) =>
				self.postCommand('/api/player/playback-rate', {
					window: event.options.window,
					rate: Math.max(0.25, Math.min(10, Number(event.options.rate))),
				}),
		},
		player_next: {
			name: 'Player: Next item',
			options: [],
			callback: async () => self.postCommand('/api/player/next'),
		},
		player_previous: {
			name: 'Player: Previous item',
			options: [],
			callback: async () => self.postCommand('/api/player/previous'),
		},
		player_select_window: {
			name: 'Player: Select active window',
			options: [
				{ id: 'window', type: 'dropdown', label: 'Window', default: 'toggle', choices: [...WINDOW_SELECT_CHOICES] },
			],
			callback: async (event) => {
				const selected = String(event.options.window || 'toggle')
				await self.postCommand(
					'/api/player/select-window',
					selected === 'preview' || selected === 'program' ? { window: selected } : undefined,
				)
			},
		},
		player_toggle_extended: {
			name: 'Player: Toggle extended display',
			options: [],
			callback: async () => self.postCommand('/api/player/toggle-extended'),
		},
		screenshot_preview: {
			name: 'Player: Screenshot preview',
			options: [],
			callback: async () => self.postCommand('/api/player/screenshot/preview'),
		},
		screenshot_program: {
			name: 'Player: Screenshot program',
			options: [],
			callback: async () => self.postCommand('/api/player/screenshot/program'),
		},
		player_take: {
			name: 'Player: Take',
			options: [],
			callback: async () => self.postCommand('/api/player/take'),
		},
		player_cut: {
			name: 'Player: Cut',
			options: [],
			callback: async () => self.postCommand('/api/player/cut'),
		},
		player_fade: {
			name: 'Player: Fade',
			options: [{ id: 'duration', type: 'number', label: 'Duration (ms)', default: 1000, min: 0, max: 10000 }],
			callback: async (event) =>
				self.postCommand('/api/player/fade', { duration: Math.max(0, Number(event.options.duration)) }),
		},
		player_fade_to_alpha: {
			name: 'Player: Fade to alpha',
			options: [{ id: 'duration', type: 'number', label: 'Duration (ms)', default: 1000, min: 0, max: 10000 }],
			callback: async (event) =>
				self.postCommand('/api/player/fade-to-alpha', { duration: Math.max(0, Number(event.options.duration)) }),
		},
		player_set_transition: {
			name: 'Player: Set default transition',
			options: [
				{ id: 'type', type: 'dropdown', label: 'Transition type', default: 'fade', choices: [...TRANSITION_CHOICES] },
				{ id: 'duration', type: 'number', label: 'Duration (ms)', default: 1000, min: 0, max: 10000 },
			],
			callback: async (event) =>
				self.postCommand('/api/player/transition', {
					type: event.options.type,
					duration: Math.max(0, Number(event.options.duration)),
				}),
		},
		player_eject: {
			name: 'Player: Eject window media',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'program',
					choices: [
						{ id: 'preview', label: 'Preview' },
						{ id: 'program', label: 'Program' },
					],
				},
			],
			callback: async (event) => self.postCommand('/api/player/eject', { window: event.options.window }),
		},
		player_mark_in: {
			name: 'Player: Set mark in',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{
					id: 'time',
					type: 'number',
					label: 'Time in seconds (-1 = current position)',
					default: -1,
					min: -1,
					max: 86400,
				},
			],
			callback: async (event) => {
				const time = Number(event.options.time)
				await runWindowCommand(self, event.options.window, '/api/player/mark-in', time >= 0 ? { time } : undefined)
			},
		},
		player_mark_out: {
			name: 'Player: Set mark out',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{
					id: 'time',
					type: 'number',
					label: 'Time in seconds (-1 = current position)',
					default: -1,
					min: -1,
					max: 86400,
				},
			],
			callback: async (event) => {
				const time = Number(event.options.time)
				await runWindowCommand(self, event.options.window, '/api/player/mark-out', time >= 0 ? { time } : undefined)
			},
		},
		player_clear_marks: {
			name: 'Player: Clear marks',
			options: [],
			callback: async () => self.postCommand('/api/player/clear-marks'),
		},
		player_goto_mark_in: {
			name: 'Player: Go to mark in',
			options: [],
			callback: async () => self.postCommand('/api/player/goto-mark-in'),
		},
		player_goto_mark_out: {
			name: 'Player: Go to mark out',
			options: [],
			callback: async () => self.postCommand('/api/player/goto-mark-out'),
		},
		player_set_repeat: {
			name: 'Player: Set loop',
			options: [
				{ id: 'state', type: 'dropdown', label: 'Loop state', default: 'toggle', choices: [...TOGGLE_CHOICES] },
				{ id: 'mode', type: 'dropdown', label: 'Loop mode', default: 'loop', choices: [...LOOP_MODE_CHOICES] },
			],
			callback: async (event) => {
				const enabled = toggleChoiceToPayload(event.options.state)
				await self.postCommand('/api/player/repeat', {
					...(enabled === undefined ? {} : { enabled }),
					mode: event.options.mode,
				})
			},
		},
		player_set_mute: {
			name: 'Player: Mute audio',
			options: [
				{ id: 'target', type: 'dropdown', label: 'Bus', default: 'main', choices: [...MUTE_TARGET_CHOICES] },
				{ id: 'state', type: 'dropdown', label: 'Mute state', default: 'toggle', choices: [...TOGGLE_CHOICES] },
			],
			callback: async (event) => {
				// 'on' means muted. The app resolves a toggle, since it holds the
				// switch and a remote client would be flipping a polled copy.
				const muted = toggleChoiceToPayload(event.options.state)
				await self.postCommand('/api/player/mute', {
					target: event.options.target,
					...(muted === undefined ? {} : { muted }),
				})
			},
		},
		player_set_shuffle: {
			name: 'Player: Set shuffle',
			options: [
				{ id: 'state', type: 'dropdown', label: 'Shuffle state', default: 'toggle', choices: [...TOGGLE_CHOICES] },
			],
			callback: async (event) => {
				const enabled = toggleChoiceToPayload(event.options.state)
				await self.postCommand('/api/player/shuffle', enabled === undefined ? undefined : { enabled })
			},
		},
		// ── The two Dual Player gangs ────────────────────────────────────────
		//
		// Neither takes a player: they describe the relationship *between* the
		// two, so "which player" is not a question they have. Both default to
		// Toggle, which is what a single button wants; On and Off are there for
		// a macro, which cannot know which way a toggle will land.
		dual_sync_transports: {
			name: 'Dual Player: Sync transports',
			description: 'Gang Play, Pause, Stop, Seek, Speed, Eject, Loop and Next / Previous across both players.',
			options: [
				{ id: 'state', type: 'dropdown', label: 'Sync state', default: 'toggle', choices: [...TOGGLE_CHOICES] },
			],
			callback: async (event) => {
				const enabled = toggleChoiceToPayload(event.options.state)
				await self.postCommand('/api/player/sync-transports', enabled === undefined ? undefined : { enabled })
			},
		},
		dual_sync_transitions: {
			name: 'Dual Player: Sync transitions',
			description: 'TAKE, CUT, FADE and the modes fire at the same instant on both players — each taking its own PVW.',
			options: [
				{ id: 'state', type: 'dropdown', label: 'Sync state', default: 'toggle', choices: [...TOGGLE_CHOICES] },
			],
			callback: async (event) => {
				const enabled = toggleChoiceToPayload(event.options.state)
				await self.postCommand('/api/player/sync-transitions', enabled === undefined ? undefined : { enabled })
			},
		},
		player_play_index: {
			name: 'Player: Play playlist index',
			options: [
				{
					id: 'playlistChoice',
					type: 'dropdown',
					label: 'Playlist',
					default: ACTIVE_PLAYLIST_CHOICE,
					choices: getPlaylistChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'index', type: 'number', label: 'Media index (0-based)', default: 0, min: 0, max: 9999 },
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'program',
					choices: [
						{ id: 'preview', label: 'Preview' },
						{ id: 'program', label: 'Program' },
					],
				},
			],
			callback: async (event) =>
				self.postCommand('/api/player/play-index', {
					playlistId: resolvePlaylistId(self, event.options.playlistChoice, event.options.playlistId) || undefined,
					index: Math.max(0, Number(event.options.index)),
					window: event.options.window,
				}),
		},
		player_load_index: {
			name: 'Player: Load playlist index',
			options: [
				{
					id: 'playlistChoice',
					type: 'dropdown',
					label: 'Playlist',
					default: ACTIVE_PLAYLIST_CHOICE,
					choices: getPlaylistChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'index', type: 'number', label: 'Media index (0-based)', default: 0, min: 0, max: 9999 },
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'preview',
					choices: [
						{ id: 'preview', label: 'Preview' },
						{ id: 'program', label: 'Program' },
					],
				},
			],
			callback: async (event) =>
				self.postCommand('/api/player/load-playlist-media', {
					playlistId: resolvePlaylistId(self, event.options.playlistChoice, event.options.playlistId) || undefined,
					index: Math.max(0, Number(event.options.index)),
					window: event.options.window,
				}),
		},
		player_play_playlist: {
			name: 'Player: Play playlist',
			options: [
				{
					id: 'playlistChoice',
					type: 'dropdown',
					label: 'Playlist',
					default: ACTIVE_PLAYLIST_CHOICE,
					choices: getPlaylistChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'startIndex', type: 'number', label: 'Start index (0-based)', default: 0, min: 0, max: 9999 },
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'program',
					choices: [
						{ id: 'preview', label: 'Preview' },
						{ id: 'program', label: 'Program' },
					],
				},
			],
			callback: async (event) =>
				self.postCommand('/api/player/play-playlist', {
					playlistId: resolvePlaylistId(self, event.options.playlistChoice, event.options.playlistId) || undefined,
					startIndex: Math.max(0, Number(event.options.startIndex)),
					window: event.options.window,
				}),
		},
		player_play_media: {
			name: 'Player: Play playlist media',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'program',
					choices: [
						{ id: 'preview', label: 'Preview' },
						{ id: 'program', label: 'Program' },
					],
				},
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'player_play_media: mediaId is required')
					return
				}

				await self.postCommand('/api/player/play-media', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					window: event.options.window,
				})
			},
		},
		player_load_media: {
			name: 'Player: Load playlist media (Program: first frame, paused)',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'preview',
					choices: [
						{ id: 'preview', label: 'Preview' },
						{ id: 'program', label: 'Program' },
					],
				},
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'player_load_media: mediaId is required')
					return
				}

				await self.postCommand('/api/player/load-media', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					window: event.options.window,
				})
			},
		},
		// The same endpoint as above with the window fixed: a media cued on the
		// Program lands on its Mark IN frame, paused, waiting for Play.
		player_load_program: {
			name: 'Player: Load media in Program (first frame, paused)',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'player_load_program: mediaId is required')
					return
				}

				await self.postCommand('/api/player/load-media', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					window: 'program',
				})
			},
		},
		library_play_item: {
			name: 'Library: Play item',
			options: [
				{ id: 'libraryChoice', type: 'dropdown', label: 'Library item', default: '', choices: getLibraryChoices(self) },
				{ id: 'libraryId', type: 'textinput', label: 'Library ID override', default: '', useVariables: true },
				{ id: 'path', type: 'textinput', label: 'Path override', default: '', useVariables: true },
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'program',
					choices: [
						{ id: 'preview', label: 'Preview' },
						{ id: 'program', label: 'Program' },
					],
				},
			],
			callback: async (event) => {
				const selection = resolveLibrarySelection(
					event.options.libraryChoice,
					event.options.libraryId,
					event.options.path,
				)
				if (!selection.id && !selection.path) {
					self.log('warn', 'library_play_item: id or path is required')
					return
				}

				await self.postCommand('/api/library/play', {
					id: selection.id,
					path: selection.path,
					window: event.options.window,
				})
			},
		},
		library_load_item: {
			name: 'Library: Load item',
			options: [
				{ id: 'libraryChoice', type: 'dropdown', label: 'Library item', default: '', choices: getLibraryChoices(self) },
				{ id: 'libraryId', type: 'textinput', label: 'Library ID override', default: '', useVariables: true },
				{ id: 'path', type: 'textinput', label: 'Path override', default: '', useVariables: true },
				{
					id: 'window',
					type: 'dropdown',
					label: 'Target window',
					default: 'preview',
					choices: [
						{ id: 'preview', label: 'Preview' },
						{ id: 'program', label: 'Program' },
					],
				},
			],
			callback: async (event) => {
				const selection = resolveLibrarySelection(
					event.options.libraryChoice,
					event.options.libraryId,
					event.options.path,
				)
				if (!selection.id && !selection.path) {
					self.log('warn', 'library_load_item: id or path is required')
					return
				}

				await self.postCommand('/api/library/load', {
					id: selection.id,
					path: selection.path,
					window: event.options.window,
				})
			},
		},
		library_remove_item: {
			name: 'Library: Remove item',
			options: [
				{ id: 'libraryChoice', type: 'dropdown', label: 'Library item', default: '', choices: getLibraryChoices(self) },
				{ id: 'libraryId', type: 'textinput', label: 'Library ID override', default: '', useVariables: true },
			],
			callback: async (event) => {
				const id =
					typeof event.options.libraryId === 'string' && event.options.libraryId.trim()
						? event.options.libraryId.trim()
						: typeof event.options.libraryChoice === 'string'
							? event.options.libraryChoice.trim()
							: ''
				if (!id) {
					self.log('warn', 'library_remove_item: id is required')
					return
				}

				await self.postCommand('/api/library/remove', { id })
			},
		},
		playlist_select: {
			name: 'Playlist: Select active playlist',
			options: [
				{
					id: 'playlistChoice',
					type: 'dropdown',
					label: 'Playlist',
					default: ACTIVE_PLAYLIST_CHOICE,
					choices: getPlaylistChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
			],
			callback: async (event) => {
				const playlistId = resolvePlaylistId(self, event.options.playlistChoice, event.options.playlistId)
				if (!playlistId) {
					self.log('warn', 'playlist_select: playlistId is required')
					return
				}

				await self.postCommand('/api/playlist/select', { id: playlistId })
			},
		},
		playlist_set_loop: {
			name: 'Playlist: Set global loop',
			options: [
				{
					id: 'playlistChoice',
					type: 'dropdown',
					label: 'Playlist',
					default: ACTIVE_PLAYLIST_CHOICE,
					choices: getPlaylistChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'state', type: 'dropdown', label: 'Loop', default: 'on', choices: [...ON_OFF_CHOICES] },
			],
			callback: async (event) =>
				self.postCommand('/api/playlist/patch', {
					playlistId: resolvePlaylistId(self, event.options.playlistChoice, event.options.playlistId),
					patch: { globalLoop: onOffChoiceToBoolean(event.options.state) },
				}),
		},
		playlist_set_auto_play: {
			name: 'Playlist: Set autoplay',
			options: [
				{
					id: 'playlistChoice',
					type: 'dropdown',
					label: 'Playlist',
					default: ACTIVE_PLAYLIST_CHOICE,
					choices: getPlaylistChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'state', type: 'dropdown', label: 'Autoplay', default: 'on', choices: [...ON_OFF_CHOICES] },
			],
			callback: async (event) =>
				self.postCommand('/api/playlist/patch', {
					playlistId: resolvePlaylistId(self, event.options.playlistChoice, event.options.playlistId),
					patch: { autoPlay: onOffChoiceToBoolean(event.options.state) },
				}),
		},
		playlist_set_end_action: {
			name: 'Playlist: Set end-of-playlist action',
			options: [
				{
					id: 'playlistChoice',
					type: 'dropdown',
					label: 'Playlist',
					default: ACTIVE_PLAYLIST_CHOICE,
					choices: getPlaylistChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{
					id: 'action',
					type: 'dropdown',
					label: 'End action',
					default: 'stop',
					choices: [...PLAYLIST_END_ACTION_CHOICES],
				},
				{
					id: 'targetPlaylistChoice',
					type: 'dropdown',
					label: 'Target playlist',
					default: '',
					choices: [{ id: '', label: 'No target playlist' }, ...getPlaylistChoices(self)],
				},
				{
					id: 'targetPlaylistId',
					type: 'textinput',
					label: 'Target playlist ID override',
					default: '',
					useVariables: true,
				},
				{
					id: 'targetMediaChoice',
					type: 'dropdown',
					label: 'Target media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'targetMediaId', type: 'textinput', label: 'Target media ID override', default: '', useVariables: true },
			],
			callback: async (event) => {
				const targetPlaylistId = resolvePlaylistId(
					self,
					event.options.targetPlaylistChoice,
					event.options.targetPlaylistId,
				)
				const targetMediaSelection = resolvePlaylistMediaSelection(
					self,
					event.options.targetMediaChoice,
					event.options.targetPlaylistId,
					event.options.targetMediaId,
				)
				await self.postCommand('/api/playlist/patch', {
					playlistId: resolvePlaylistId(self, event.options.playlistChoice, event.options.playlistId),
					patch: {
						endOfPlaylistAction: event.options.action,
						endOfPlaylistTargetPlaylistId: targetPlaylistId || undefined,
						endOfPlaylistTargetMediaId: targetMediaSelection.mediaId || undefined,
					},
				})
			},
		},
		playlist_item_set_disabled: {
			name: 'Playlist item: Set disabled',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{ id: 'state', type: 'dropdown', label: 'Disabled', default: 'on', choices: [...ON_OFF_CHOICES] },
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'playlist_item_set_disabled: mediaId is required')
					return
				}

				await self.postCommand('/api/playlist/item/patch', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					patch: { disabled: onOffChoiceToBoolean(event.options.state) },
				})
			},
		},
		playlist_item_set_auto_next: {
			name: 'Playlist item: Set auto next',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{ id: 'state', type: 'dropdown', label: 'Auto next', default: 'on', choices: [...ON_OFF_CHOICES] },
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'playlist_item_set_auto_next: mediaId is required')
					return
				}

				await self.postCommand('/api/playlist/item/patch', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					patch: { autoNext: onOffChoiceToBoolean(event.options.state) },
				})
			},
		},
		// Audio-only fades at Mark IN / Mark OUT, whatever the picture does.
		playlist_item_set_audio_fade: {
			name: 'Playlist item: Set audio fade',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{ id: 'fadeIn', type: 'dropdown', label: 'Audio fade IN', default: 'on', choices: [...ON_OFF_CHOICES] },
				{ id: 'fadeOut', type: 'dropdown', label: 'Audio fade OUT', default: 'on', choices: [...ON_OFF_CHOICES] },
				{
					id: 'durationMs',
					type: 'number',
					label: 'Duration (ms, 0 = playlist default)',
					default: 0,
					min: 0,
					max: 60000,
				},
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'playlist_item_set_audio_fade: mediaId is required')
					return
				}
				const durationMs = Number(event.options.durationMs)
				await self.postCommand('/api/playlist/item/patch', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					patch: {
						audioFadeIn: onOffChoiceToBoolean(event.options.fadeIn),
						audioFadeOut: onOffChoiceToBoolean(event.options.fadeOut),
						audioFadeDurationMs: Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : 0,
					},
				})
			},
		},
		playlist_item_set_comment: {
			name: 'Playlist item: Set comment',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{
					id: 'comment',
					type: 'textinput',
					label: 'Comment (empty clears it)',
					default: '',
					useVariables: true,
				},
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'playlist_item_set_comment: mediaId is required')
					return
				}
				await self.postCommand('/api/playlist/item/patch', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					patch: { comment: String(event.options.comment ?? '') },
				})
			},
		},
		playlist_item_set_loop: {
			name: 'Playlist item: Set loop mode',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Loop mode',
					default: 'ping-pong',
					choices: [...LOOP_ITEM_MODE_CHOICES],
				},
				{ id: 'loops', type: 'number', label: 'Round-trips / plays (-1 = infinite)', default: -1, min: -1, max: 9999 },
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'playlist_item_set_loop: mediaId is required')
					return
				}
				const mode = String(event.options.mode || 'off')
				const enabled = mode !== 'off'
				const requestedLoops = Math.max(-1, Number(event.options.loops))
				await self.postCommand('/api/playlist/item/patch', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					patch: {
						loops: enabled ? (requestedLoops === 0 ? -1 : requestedLoops) : 0,
						loopMode: enabled ? mode : 'loop',
						fadeIn: mode === 'fade',
						fadeOut: mode === 'fade',
					},
				})
			},
		},
		playlist_item_set_playback_rate: {
			name: 'Playlist item: Set playback rate',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{ id: 'rate', type: 'number', label: 'Playback rate', default: 1, min: 0.01, max: 8 },
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'playlist_item_set_playback_rate: mediaId is required')
					return
				}

				await self.postCommand('/api/playlist/item/patch', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					patch: { playbackRate: Math.max(0.01, Number(event.options.rate)) },
				})
			},
		},
		playlist_item_set_offset_ms: {
			name: 'Playlist item: Set offset',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{ id: 'offset', type: 'number', label: 'Offset (ms)', default: 0, min: 0, max: 600000 },
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'playlist_item_set_offset_ms: mediaId is required')
					return
				}

				await self.postCommand('/api/playlist/item/patch', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					patch: { offset: Math.max(0, Number(event.options.offset)) },
				})
			},
		},
		playlist_item_set_color: {
			name: 'Playlist item: Set color',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{ id: 'color', type: 'colorpicker', label: 'Color', default: 0x38bdf8 },
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'playlist_item_set_color: mediaId is required')
					return
				}

				await self.postCommand('/api/playlist/item/patch', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					patch: { color: colorToHex(event.options.color, 0x38bdf8) },
				})
			},
		},
		playlist_item_set_transition: {
			name: 'Playlist item: Set transition type',
			options: [
				{
					id: 'mediaChoice',
					type: 'dropdown',
					label: 'Playlist media',
					default: '',
					choices: getPlaylistMediaChoices(self),
				},
				{ id: 'playlistId', type: 'textinput', label: 'Playlist ID override', default: '', useVariables: true },
				{ id: 'mediaId', type: 'textinput', label: 'Media ID override', default: '', useVariables: true },
				{ id: 'transition', type: 'dropdown', label: 'Transition', default: 'fade', choices: [...TRANSITION_CHOICES] },
			],
			callback: async (event) => {
				const selection = resolvePlaylistMediaSelection(
					self,
					event.options.mediaChoice,
					event.options.playlistId,
					event.options.mediaId,
				)
				if (!selection.mediaId) {
					self.log('warn', 'playlist_item_set_transition: mediaId is required')
					return
				}

				await self.postCommand('/api/playlist/item/patch', {
					playlistId: selection.playlistId,
					mediaId: selection.mediaId,
					patch: { transition: event.options.transition },
				})
			},
		},
		output_black: {
			name: 'Output: Black',
			options: [],
			callback: async () => self.postCommand('/api/output/black'),
		},
		output_clock: {
			name: 'Output: Clock',
			options: [],
			callback: async () => self.postCommand('/api/output/clock'),
		},
		output_logo: {
			name: 'Output: Logo',
			options: [],
			callback: async () => self.postCommand('/api/output/logo'),
		},
		output_pattern: {
			name: 'Output: Test pattern',
			options: [],
			callback: async () => self.postCommand('/api/output/pattern'),
		},
		ndi_initialize: {
			name: 'NDI: Initialize',
			options: [
				{
					id: 'sourceName',
					type: 'textinput',
					label: 'Source name',
					default: 'QPlayer - Programme',
					useVariables: true,
				},
				{ id: 'width', type: 'number', label: 'Width', default: 1920, min: 1, max: 7680 },
				{ id: 'height', type: 'number', label: 'Height', default: 1080, min: 1, max: 4320 },
				{ id: 'frameRate', type: 'number', label: 'Frame rate', default: 25, min: 1, max: 120 },
			],
			callback: async (event) =>
				self.postCommand('/api/ndi/initialize', {
					sourceName: String(event.options.sourceName || ''),
					width: Math.max(1, Number(event.options.width)),
					height: Math.max(1, Number(event.options.height)),
					frameRate: Math.max(1, Number(event.options.frameRate)),
				}),
		},
		ndi_start: {
			name: 'NDI: Start',
			options: [],
			callback: async () => self.postCommand('/api/ndi/start'),
		},
		ndi_stop: {
			name: 'NDI: Stop',
			options: [],
			callback: async () => self.postCommand('/api/ndi/stop'),
		},
		omt_initialize: {
			name: 'OMT: Initialize',
			options: [
				{ id: 'sourceName', type: 'textinput', label: 'Source name', default: 'QPlayer OMT', useVariables: true },
				{ id: 'width', type: 'number', label: 'Width', default: 1280, min: 1, max: 7680 },
				{ id: 'height', type: 'number', label: 'Height', default: 720, min: 1, max: 4320 },
				{ id: 'frameRate', type: 'number', label: 'Frame rate', default: 25, min: 1, max: 120 },
				{ id: 'quality', type: 'dropdown', label: 'Quality', default: 'default', choices: [...OMT_QUALITY_CHOICES] },
			],
			callback: async (event) =>
				self.postCommand('/api/omt/initialize', {
					sourceName: String(event.options.sourceName || ''),
					width: Math.max(1, Number(event.options.width)),
					height: Math.max(1, Number(event.options.height)),
					frameRate: Math.max(1, Number(event.options.frameRate)),
					quality: event.options.quality,
				}),
		},
		omt_start: {
			name: 'OMT: Start',
			options: [],
			callback: async () => self.postCommand('/api/omt/start'),
		},
		omt_stop: {
			name: 'OMT: Stop',
			options: [],
			callback: async () => self.postCommand('/api/omt/stop'),
		},
		webrtc_configure_stream: {
			name: 'QMonitor / WebRTC: Configure a stream',
			options: [
				{
					id: 'source',
					type: 'dropdown',
					label: 'Stream',
					default: 'p1.program',
					choices: [
						{ id: 'p1.program', label: 'P1 - Program' },
						{ id: 'p1.preview', label: 'P1 - Preview' },
						{ id: 'p2.program', label: 'P2 - Program' },
						{ id: 'p2.preview', label: 'P2 - Preview' },
					],
				},
				{ id: 'enabled', type: 'dropdown', label: 'Enabled', default: 'on', choices: [...ON_OFF_CHOICES] },
				{
					id: 'resolution',
					type: 'dropdown',
					label: 'Resolution',
					default: '720p',
					choices: ['native', '1080p', '720p', '540p', '360p'].map((id) => ({ id, label: id })),
				},
				{
					id: 'fps',
					type: 'dropdown',
					label: 'Frame rate',
					default: 25,
					choices: [15, 25, 30, 50, 60].map((id) => ({ id, label: `${id} fps` })),
				},
				{ id: 'bitrateKbps', type: 'number', label: 'Bitrate (kb/s)', default: 6000, min: 500, max: 50000 },
			],
			callback: async (event) => {
				const source = String(event.options.source) as 'p1.program' | 'p1.preview' | 'p2.program' | 'p2.preview'
				await self.configureWebRtcStream(source, {
					enabled: onOffChoiceToBoolean(event.options.enabled),
					resolution: String(event.options.resolution || '720p'),
					fps: Number(event.options.fps) || 25,
					bitrateKbps: Number(event.options.bitrateKbps) || 6000,
				})
			},
		},
		link_instance_name: {
			name: 'Link: Set QPlayer instance name',
			options: [{ id: 'name', type: 'textinput', label: 'Instance name', default: 'QPlayer', useVariables: true }],
			callback: async (event) => self.postCommand('/api/link/instance', { name: String(event.options.name || '') }),
		},
		link_test_peer: {
			name: 'Link: Test a QPlayer connection',
			options: [
				{
					id: 'address',
					type: 'textinput',
					label: 'Target IP or host (port 2224 by default)',
					default: '',
					useVariables: true,
				},
				{ id: 'pin', type: 'textinput', label: 'Target API PIN (optional)', default: '', useVariables: true },
				{
					id: 'expectedRole',
					type: 'dropdown',
					label: 'Expected role',
					default: '',
					choices: [
						{ id: '', label: 'Any role' },
						{ id: 'backup', label: 'BACKUP' },
						{ id: 'spare', label: 'SLAVE' },
					],
				},
			],
			callback: async (event) => {
				const result = await self.postCommandForResult<{ success?: boolean; error?: string; name?: string }>(
					'/api/link/test',
					{
						address: String(event.options.address || ''),
						pin: String(event.options.pin || ''),
						expectedRole: String(event.options.expectedRole || ''),
					},
					{ refresh: false },
				)
				if (result?.success === true)
					self.log('info', `QPlayer Link test succeeded${result.name ? `: ${result.name}` : ''}`)
				else self.log('warn', `QPlayer Link test failed: ${result?.error || 'unknown error'}`)
			},
		},
		link_sync_project: {
			name: 'Link: Push project to BACKUP / SLAVE',
			options: [
				{
					id: 'address',
					type: 'textinput',
					label: 'Target IP or host[:port]',
					default: '192.168.1.42',
					useVariables: true,
				},
				{ id: 'pin', type: 'textinput', label: 'Target API PIN (optional)', default: '', useVariables: true },
				{
					id: 'destination',
					type: 'dropdown',
					label: 'Destination folder',
					default: 'desktop',
					choices: [
						{ id: 'desktop', label: 'Desktop / QPlayer Transfers' },
						{ id: 'documents', label: 'Documents / QPlayer / Transfers' },
					],
				},
				{
					id: 'includeMedia',
					type: 'dropdown',
					label: 'Content',
					default: 'all',
					choices: [
						{ id: 'all', label: 'Project and media' },
						{ id: 'config', label: 'Project configuration only' },
					],
				},
				{
					id: 'projectName',
					type: 'textinput',
					label: 'Destination project name',
					default: 'QPlayer Project',
					useVariables: true,
				},
			],
			callback: async (event) =>
				self.postCommand('/api/link/sync', {
					target: {
						address: String(event.options.address || ''),
						pin: String(event.options.pin || ''),
					},
					destination: event.options.destination === 'documents' ? 'documents' : 'desktop',
					includeMedia: event.options.includeMedia !== 'config',
					projectName: String(event.options.projectName || 'QPlayer Project'),
				}),
		},
		link_send_media: {
			name: 'Link: Send media files to another QPlayer',
			options: [
				{
					id: 'mediaIds',
					type: 'textinput',
					label: 'Media IDs (comma or space separated)',
					default: '',
					useVariables: true,
				},
				{
					id: 'address',
					type: 'textinput',
					label: 'Target IP or host (port 2224 by default)',
					default: '',
					useVariables: true,
				},
				{ id: 'pin', type: 'textinput', label: 'Target API PIN (optional)', default: '', useVariables: true },
				{
					id: 'destination',
					type: 'dropdown',
					label: 'Destination folder',
					default: 'desktop',
					choices: [
						{ id: 'desktop', label: 'Desktop / QPlayer Transfers' },
						{ id: 'documents', label: 'Documents / QPlayer / Transfers' },
					],
				},
			],
			callback: async (event) => {
				const mediaIds = String(event.options.mediaIds || '')
					.split(/[\s,;]+/)
					.map((id) => id.trim())
					.filter(Boolean)
				if (!mediaIds.length || mediaIds.some((id) => !/^[a-f0-9]{24}$/i.test(id))) {
					self.log('warn', 'link_send_media: every media ID must be a 24-character hexadecimal catalog ID')
					return
				}
				await self.postCommand(
					'/api/link/media/send',
					{
						mediaIds: [...new Set(mediaIds)],
						target: {
							address: String(event.options.address || ''),
							pin: String(event.options.pin || ''),
						},
						destination: event.options.destination === 'documents' ? 'documents' : 'desktop',
					},
					{ refresh: false },
				)
			},
		},
		link_takeover: {
			name: 'Link: BACKUP take control as MASTER',
			options: [],
			callback: async () => self.postCommand('/api/link/takeover'),
		},
		monitor_window_open: {
			name: 'Monitor: Open, close or toggle the monitor window',
			options: [
				{
					id: 'action',
					type: 'dropdown',
					label: 'Action',
					default: 'toggle',
					choices: [...MONITOR_WINDOW_ACTION_CHOICES],
				},
				{
					id: 'fullscreen',
					type: 'dropdown',
					label: 'Fullscreen (when opening)',
					default: 'on',
					choices: [...ON_OFF_CHOICES],
					isVisible: (options) => options.action !== 'close',
				},
			],
			callback: async (event) => {
				if (event.options.action === 'close') {
					await self.postCommand('/api/monitor-window-target/close')
					return
				}

				// The app decides what a toggle means. Reading our own polled
				// state to choose here would act on what was true a second ago.
				await self.postCommand('/api/monitor-window-target/open', {
					fullscreen: onOffChoiceToBoolean(event.options.fullscreen),
					toggle: event.options.action !== 'open',
				})
			},
		},
	}

	applyPlayerTargeting(self, definitions)
	self.setActionDefinitions(definitions)
}
