import { variableOptionIds, resolveVariableOptions } from './optionVariables.js'
import { combineRgb } from '@companion-module/base'
import type { CompanionFeedbackDefinitions, SomeCompanionFeedbackInputField } from '@companion-module/base'
import {
	ACTION_PLAYER_CHOICES,
	AUDIO_METER_CHOICES,
	COMPARISON_CHOICES,
	MARK_STATE_CHOICES,
	MATCH_CHOICES,
	MEDIA_TYPE_CHOICES,
	MUTE_TARGET_CHOICES,
	LOOP_MODE_CHOICES,
	PLAYER_CHOICES,
	PROGRAM_MODE_CHOICES,
	REMAINING_THRESHOLD_SOURCE_CHOICES,
	WINDOW_WITH_ACTIVE_CHOICES,
	WINDOW_CHOICES,
} from './choices.js'
import {
	compareNumbers,
	compareStrings,
	getAudioMeterValue,
	getActiveWindow,
	getMediaDisplayName,
	getMediaType,
	getPlaybackDirection,
	getProgramOffsetCountdownSeconds,
	getWindowDuration,
	getWindowBounds,
	getWindowMedia,
	getWindowProgressPercent,
	getWindowRemaining,
	resolveRemainingThresholdSeconds,
	type WindowTarget,
} from './state.js'
import type { ModuleInstance } from './main.js'

function remainingStyleColor(
	remainingSeconds: number,
	warnSeconds: number,
	alertSeconds: number,
): { bgcolor: number; color: number } {
	const highThreshold = Math.max(warnSeconds, alertSeconds)
	const lowThreshold = Math.min(warnSeconds, alertSeconds)

	if (remainingSeconds <= lowThreshold) {
		return {
			bgcolor: combineRgb(220, 38, 38),
			color: combineRgb(255, 255, 255),
		}
	}

	if (remainingSeconds <= highThreshold) {
		return {
			bgcolor: combineRgb(245, 158, 11),
			color: combineRgb(0, 0, 0),
		}
	}

	return {
		bgcolor: combineRgb(22, 163, 74),
		color: combineRgb(255, 255, 255),
	}
}

function resolveWindowOrActive(self: ModuleInstance, value: unknown): WindowTarget {
	if (value === 'preview' || value === 'program') {
		return value
	}

	return getActiveWindow(self.getCommandState())
}

/**
 * Feedbacks that describe one Player rather than the connection itself.
 *
 * Everything except the connection check, the "which Player is controlled"
 * indicator, the monitoring-window target and the two Dual Player gangs, none
 * of which belong to a playback channel. The gangs describe the relationship
 * *between* the Players, so a Target Player on them would change nothing.
 */
const CONNECTION_SCOPED_FEEDBACK_IDS = new Set([
	'connected',
	'controlled_player',
	'link_role',
	'monitor_available',
	'dual_sync_transports_enabled',
	'dual_sync_transitions_enabled',
])

const PLAYER_TARGET_OPTION = {
	id: 'player',
	type: 'dropdown',
	label: 'Target Player',
	default: 'active',
	choices: [...ACTION_PLAYER_CHOICES],
} as const satisfies SomeCompanionFeedbackInputField

/**
 * Give every Player-scoped feedback the same Player dropdown the actions have.
 *
 * A readout button is a pair — the variable that prints the number and the
 * feedback that colours it — so both halves have to be able to name the same
 * Player, or the countdown turns red for the wrong one.
 */
function applyPlayerTargeting(self: ModuleInstance, definitions: CompanionFeedbackDefinitions): void {
	for (const [feedbackId, definition] of Object.entries(definitions)) {
		if (!definition || CONNECTION_SCOPED_FEEDBACK_IDS.has(feedbackId)) {
			continue
		}

		definition.options = [...definition.options, { ...PLAYER_TARGET_OPTION }]
		const inner = definition.callback.bind(definition) as (...args: unknown[]) => unknown
		definition.callback = ((...args: unknown[]) => {
			const choice = (args[0] as { options?: Record<string, unknown> })?.options?.player
			const player = choice === 'p1' || choice === 'p2' ? choice : undefined
			const event = args[0] as { options: Record<string, unknown> }
			const ids = variableOptionIds(definition.options, event.options)
			if (ids.length === 0) return self.evaluateForPlayer(player, () => inner(...args))
			return self.evaluateForPlayer(player, async () => {
				const options = await resolveVariableOptions(
					event.options,
					ids,
					args[1] as { parseVariablesInString: (text: string) => Promise<string> },
				)
				return inner({ ...event, options }, ...args.slice(1))
			})
		}) as typeof definition.callback
	}
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	const definitions: CompanionFeedbackDefinitions = {
		connected: {
			name: 'Connection is ok',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(22, 163, 74), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.isConnected,
		},
		active_playing: {
			name: 'Active window is playing',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			options: [],
			callback: () => self.getCommandState()?.isPlaying === true,
		},
		active_window: {
			name: 'Active window matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			options: [{ id: 'window', type: 'dropdown', label: 'Window', default: 'program', choices: [...WINDOW_CHOICES] }],
			callback: (feedback) => self.getCommandState()?.activeWindow === feedback.options.window,
		},
		preview_playing: {
			name: 'Preview is playing',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(14, 165, 233), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandState()?.isPreviewPlaying === true,
		},
		program_playing: {
			name: 'Program is playing',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(99, 102, 241), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandState()?.isProgramPlaying === true,
		},
		repeat_enabled: {
			name: 'Repeat is enabled',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(168, 85, 247), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandState()?.repeatEnabled === true,
		},
		repeat_mode: {
			name: 'Repeat mode matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(126, 34, 206), color: combineRgb(255, 255, 255) },
			options: [
				{ id: 'mode', type: 'dropdown', label: 'Loop mode', default: 'ping-pong', choices: [...LOOP_MODE_CHOICES] },
			],
			callback: (feedback) =>
				self.getCommandState()?.repeatEnabled === true && self.getCommandState()?.repeatMode === feedback.options.mode,
		},
		playback_direction: {
			name: 'Playback direction matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(14, 116, 144), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{
					id: 'direction',
					type: 'dropdown',
					label: 'Direction',
					default: 'backward',
					choices: [
						{ id: 'forward', label: 'Forward' },
						{ id: 'backward', label: 'Backward' },
					],
				},
			],
			callback: (feedback) =>
				getPlaybackDirection(self.getCommandState(), resolveWindowOrActive(self, feedback.options.window)) ===
				feedback.options.direction,
		},
		controlled_player: {
			name: 'Controlled Player matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(8, 145, 178), color: combineRgb(255, 255, 255) },
			options: [{ id: 'player', type: 'dropdown', label: 'Player', default: 'p1', choices: [...PLAYER_CHOICES] }],
			callback: (feedback) => self.getTargetPlayerId() === feedback.options.player,
		},
		link_role: {
			name: 'QPlayer Link role matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(124, 58, 237), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'role',
					type: 'dropdown',
					label: 'Role',
					default: 'main',
					choices: [
						{ id: 'off', label: 'Off' },
						{ id: 'main', label: 'MASTER' },
						{ id: 'backup', label: 'BACKUP' },
						{ id: 'spare', label: 'SLAVE' },
					],
				},
			],
			callback: (feedback) => self.getCommandState()?.spareRole === feedback.options.role,
		},
		shuffle_enabled: {
			name: 'Shuffle is enabled',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(236, 72, 153), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandState()?.shuffleEnabled === true,
		},
		// The two Dual Player gangs. Read from the state the app publishes rather
		// than from a copy the button keeps: the operator can turn either one on
		// from the toolbar, and a button lying about a gang is worse than one
		// that cannot toggle it.
		dual_sync_transports_enabled: {
			name: 'Dual Player: transports are ganged',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(139, 92, 246), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandState()?.dualPlayerSyncTransports === true,
		},
		dual_sync_transitions_enabled: {
			name: 'Dual Player: transitions are ganged',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(139, 92, 246), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandState()?.dualPlayerSyncTransitions === true,
		},
		transition_active: {
			name: 'Transition is active',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(245, 158, 11), color: combineRgb(0, 0, 0) },
			options: [],
			callback: () => self.getCommandState()?.isTransitioning === true,
		},
		program_mode: {
			name: 'Program mode matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(15, 23, 42), color: combineRgb(255, 255, 255) },
			options: [
				{ id: 'mode', type: 'dropdown', label: 'Program mode', default: 'black', choices: [...PROGRAM_MODE_CHOICES] },
			],
			callback: (feedback) => self.getCommandState()?.programMode === feedback.options.mode,
		},
		media_loaded: {
			name: 'Window has media loaded',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(2, 132, 199), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
			],
			callback: (feedback) => {
				const media = getWindowMedia(self.getCommandState(), resolveWindowOrActive(self, feedback.options.window))
				return !!media && !!getMediaDisplayName(media)
			},
		},
		media_type: {
			name: 'Window media type matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(37, 99, 235), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'type', type: 'dropdown', label: 'Media type', default: 'video', choices: [...MEDIA_TYPE_CHOICES] },
			],
			callback: (feedback) =>
				getMediaType(getWindowMedia(self.getCommandState(), resolveWindowOrActive(self, feedback.options.window))) ===
				feedback.options.type,
		},
		media_name_matches: {
			name: 'Window media name matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(6, 182, 212), color: combineRgb(0, 0, 0) },
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'matchType', type: 'dropdown', label: 'Match type', default: 'contains', choices: [...MATCH_CHOICES] },
				{ id: 'text', type: 'textinput', label: 'Media name', default: '', useVariables: true },
			],
			callback: (feedback) =>
				compareStrings(
					String(feedback.options.matchType),
					getMediaDisplayName(
						getWindowMedia(self.getCommandState(), resolveWindowOrActive(self, feedback.options.window)),
					),
					String(feedback.options.text ?? ''),
				),
		},
		media_path_matches: {
			name: 'Window media path matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(8, 145, 178), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'matchType', type: 'dropdown', label: 'Match type', default: 'contains', choices: [...MATCH_CHOICES] },
				{ id: 'text', type: 'textinput', label: 'Media path text', default: '', useVariables: true },
			],
			callback: (feedback) =>
				compareStrings(
					String(feedback.options.matchType),
					String(
						getWindowMedia(self.getCommandState(), resolveWindowOrActive(self, feedback.options.window))?.path ?? '',
					),
					String(feedback.options.text ?? ''),
				),
		},
		active_playlist_name_matches: {
			name: 'Active playlist name matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(124, 58, 237), color: combineRgb(255, 255, 255) },
			options: [
				{ id: 'matchType', type: 'dropdown', label: 'Match type', default: 'exact', choices: [...MATCH_CHOICES] },
				{ id: 'text', type: 'textinput', label: 'Playlist name', default: '', useVariables: true },
			],
			callback: (feedback) =>
				compareStrings(
					String(feedback.options.matchType),
					String(self.getActivePlaylist()?.name ?? ''),
					String(feedback.options.text ?? ''),
				),
		},
		marks_set: {
			name: 'Marks are set',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(251, 191, 36), color: combineRgb(0, 0, 0) },
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'kind', type: 'dropdown', label: 'Marks', default: 'both', choices: [...MARK_STATE_CHOICES] },
			],
			callback: (feedback) => {
				const bounds = getWindowBounds(self.getCommandState(), resolveWindowOrActive(self, feedback.options.window))
				const markInSet = bounds.hasMarkIn
				const markOutSet = bounds.hasMarkOut

				switch (feedback.options.kind) {
					case 'in':
						return markInSet
					case 'out':
						return markOutSet
					case 'both':
					default:
						return markInSet && markOutSet
				}
			},
		},
		remaining_time_compare: {
			name: 'Window remaining time comparison',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(22, 163, 74), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'operator', type: 'dropdown', label: 'Operator', default: 'lte', choices: [...COMPARISON_CHOICES] },
				{ id: 'seconds', type: 'number', label: 'Seconds', default: 60, min: 0, max: 86400 },
			],
			callback: (feedback) =>
				compareNumbers(
					String(feedback.options.operator),
					getWindowRemaining(self.getCommandState(), resolveWindowOrActive(self, feedback.options.window)),
					Number(feedback.options.seconds),
				),
		},
		elapsed_percent_compare: {
			name: 'Window progress percent comparison',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'operator', type: 'dropdown', label: 'Operator', default: 'gte', choices: [...COMPARISON_CHOICES] },
				{ id: 'percent', type: 'number', label: 'Percent', default: 50, min: 0, max: 100 },
			],
			callback: (feedback) =>
				compareNumbers(
					String(feedback.options.operator),
					getWindowProgressPercent(self.getCommandState(), resolveWindowOrActive(self, feedback.options.window)),
					Number(feedback.options.percent),
				),
		},
		remaining_time_dynamic: {
			name: 'Window remaining time dynamic style',
			type: 'advanced',
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{
					id: 'source',
					type: 'dropdown',
					label: 'Thresholds',
					default: 'app',
					choices: [...REMAINING_THRESHOLD_SOURCE_CHOICES],
				},
				{
					id: 'warnSeconds',
					type: 'number',
					label: 'Warn threshold (s)',
					default: 60,
					min: 0,
					max: 86400,
					isVisible: (options) => options.source === 'custom',
				},
				{
					id: 'alertSeconds',
					type: 'number',
					label: 'Alert threshold (s)',
					default: 15,
					min: 0,
					max: 86400,
					isVisible: (options) => options.source === 'custom',
				},
			],
			callback: (feedback) => {
				const state = self.getCommandState()
				const window = resolveWindowOrActive(self, feedback.options.window)
				const duration = getWindowDuration(state, window)
				if (duration <= 0) {
					return {}
				}

				// Anything but an explicit 'custom' follows the application, buttons
				// built before this option included: they were dropped in from a
				// preset carrying the old fixed numbers, and following the panel is
				// what makes them agree with the interface they sit next to.
				const thresholds =
					feedback.options.source === 'custom'
						? {
								warnSeconds: Math.max(0, Number(feedback.options.warnSeconds)),
								alertSeconds: Math.max(0, Number(feedback.options.alertSeconds)),
							}
						: resolveRemainingThresholdSeconds(state, duration)

				return remainingStyleColor(getWindowRemaining(state, window), thresholds.warnSeconds, thresholds.alertSeconds)
			},
		},
		audio_meter_compare: {
			name: 'Audio meter comparison',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(20, 184, 166), color: combineRgb(0, 0, 0) },
			options: [
				{
					id: 'window',
					type: 'dropdown',
					label: 'Window',
					default: 'active',
					choices: [...WINDOW_WITH_ACTIVE_CHOICES],
				},
				{ id: 'field', type: 'dropdown', label: 'Meter field', default: 'leftPeak', choices: [...AUDIO_METER_CHOICES] },
				{ id: 'operator', type: 'dropdown', label: 'Operator', default: 'gte', choices: [...COMPARISON_CHOICES] },
				{ id: 'value', type: 'number', label: 'Value', default: 0.8, min: 0, max: 10 },
			],
			callback: (feedback) =>
				compareNumbers(
					String(feedback.options.operator),
					getAudioMeterValue(
						self.getCommandState(),
						resolveWindowOrActive(self, feedback.options.window),
						feedback.options.field as 'left' | 'right' | 'leftPeak' | 'rightPeak',
					),
					Number(feedback.options.value),
				),
		},
		program_offset_countdown_active: {
			name: 'Program offset countdown is active',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(249, 115, 22), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => getProgramOffsetCountdownSeconds(self.getCommandState()?.programOffsetCountdownDeadline) > 0,
		},
		ndi_enabled: {
			name: 'NDI is enabled',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(79, 70, 229), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandNdi()?.enabled === true,
		},
		ndi_running: {
			name: 'NDI is running',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(99, 102, 241), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandNdi()?.running === true,
		},
		omt_available: {
			name: 'OMT is available',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(15, 118, 110), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandOmt()?.available === true,
		},
		omt_running: {
			name: 'OMT is running',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(13, 148, 136), color: combineRgb(0, 0, 0) },
			options: [],
			callback: () => self.getCommandOmt()?.running === true,
		},
		audio_muted: {
			name: 'Audio bus is muted',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(220, 38, 38), color: combineRgb(255, 255, 255) },
			options: [{ id: 'target', type: 'dropdown', label: 'Bus', default: 'main', choices: [...MUTE_TARGET_CHOICES] }],
			callback: (feedback) => {
				const state = self.getCommandState()
				// Both switches are published as "enabled", so muted is the absence
				// of it — and an undefined switch means the app never said, which
				// is not the same as muted.
				return feedback.options.target === 'monitor'
					? state?.monitoringEnabled === false
					: state?.mainMixEnabled === false
			},
		},
		extended_display_available: {
			name: 'Extended (fullscreen) output can be driven',
			description:
				'False when this Player has no free display to send its programme to. Invert it to grey a Fullscreen button out.',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(51, 65, 85), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandState()?.extendedDisplay?.available === true,
		},
		extended_display_open: {
			name: 'Extended (fullscreen) output is open',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(22, 163, 74), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.getCommandState()?.extendedDisplay?.open === true,
		},
		monitor_available: {
			name: 'Monitor output target available',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(14, 165, 233), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.runtimeState.monitorWindow?.available === true,
		},
	}

	applyPlayerTargeting(self, definitions)
	self.setFeedbackDefinitions(definitions)
}
