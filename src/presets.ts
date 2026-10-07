import type {
	CompanionOptionValues,
	CompanionPresetDefinitions,
	CompanionPresetFeedback,
	CompanionTextSize,
} from '@companion-module/base'
import { combineRgb } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export function UpdatePresets(self: ModuleInstance): void {
	const moduleId = 'videopathe-qplayer'
	const readoutCategory = 'Readouts'
	const variable = (name: string) => `$(${moduleId}:${name})`
	const disconnectedFeedback = {
		feedbackId: 'connected',
		options: {},
		isInverted: true,
		style: {
			bgcolor: combineRgb(127, 29, 29),
			color: combineRgb(255, 255, 255),
		},
	} satisfies CompanionPresetFeedback

	const presets: CompanionPresetDefinitions = {}

	function createActionPreset(
		id: string,
		category: string,
		name: string,
		text: string,
		bgcolor: number,
		color: number,
		actionId: string,
		options: CompanionOptionValues = {},
		feedbacks: CompanionPresetFeedback[] = [],
		// Explicit rather than 'auto': auto sizing picks a face big enough to
		// break short labels across lines ("TAK / E"), and it picks a different
		// one per label, so neighbouring buttons in a row never match.
		size: CompanionTextSize = '18',
	): void {
		presets[id] = {
			type: 'button',
			category,
			name,
			style: {
				text,
				size,
				color,
				bgcolor,
				show_topbar: false,
			},
			steps: [
				{
					down: [{ actionId, options }],
					up: [],
				},
			],
			feedbacks: [disconnectedFeedback, ...feedbacks],
		}
	}

	function createReadoutPreset(
		id: string,
		name: string,
		text: string,
		bgcolor: number,
		size: CompanionTextSize,
		feedbacks: CompanionPresetFeedback[] = [],
	): void {
		presets[id] = {
			type: 'button',
			category: readoutCategory,
			name,
			style: {
				text,
				size,
				color: combineRgb(255, 255, 255),
				bgcolor,
				show_topbar: false,
			},
			steps: [
				{
					down: [],
					up: [],
				},
			],
			feedbacks: [disconnectedFeedback, ...feedbacks],
		}
	}

	createActionPreset(
		'play',
		'Transport',
		'Play active window',
		'▶',
		combineRgb(22, 163, 74),
		combineRgb(255, 255, 255),
		'player_play',
		{ window: 'active' },
		[
			{
				feedbackId: 'active_playing',
				options: {},
				style: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			},
		],
		'18',
	)
	createActionPreset(
		'pause',
		'Transport',
		'Pause active window',
		'⏸',
		combineRgb(234, 179, 8),
		combineRgb(0, 0, 0),
		'player_pause',
		{ window: 'active' },
		[],
		'18',
	)
	createActionPreset(
		'stop',
		'Transport',
		'Stop active window',
		'⏹',
		combineRgb(220, 38, 38),
		combineRgb(255, 255, 255),
		'player_stop',
		{ window: 'active' },
		[],
		'18',
	)
	createActionPreset(
		'take',
		'Transport',
		'Take preview to program',
		'TAKE',
		combineRgb(59, 130, 246),
		combineRgb(255, 255, 255),
		'player_take',
	)
	createActionPreset(
		'cut',
		'Transport',
		'Cut preview to program',
		'CUT',
		combineRgb(37, 99, 235),
		combineRgb(255, 255, 255),
		'player_cut',
	)
	// The media chosen in the action's options lands on the Program on its
	// first frame, paused: a cue button for a clip that must wait for Play.
	createActionPreset(
		'load_program',
		'Transport',
		'Load media in Program (first frame)',
		'LOAD\nPGM',
		combineRgb(127, 29, 29),
		combineRgb(255, 255, 255),
		'player_load_program',
		{ mediaChoice: '', playlistId: '', mediaId: '' },
		[],
		'14',
	)
	createActionPreset(
		'fade',
		'Transport',
		'Fade preview to program',
		'FADE',
		combineRgb(99, 102, 241),
		combineRgb(255, 255, 255),
		'player_fade',
		{ duration: 1000 },
		[
			{
				feedbackId: 'transition_active',
				options: {},
				style: { bgcolor: combineRgb(245, 158, 11), color: combineRgb(0, 0, 0) },
			},
		],
	)
	createActionPreset(
		'next',
		'Transport',
		'Next item',
		'⏭',
		combineRgb(2, 132, 199),
		combineRgb(255, 255, 255),
		'player_next',
	)
	createActionPreset(
		'previous',
		'Transport',
		'Previous item',
		'⏮',
		combineRgb(14, 116, 144),
		combineRgb(255, 255, 255),
		'player_previous',
	)
	createActionPreset(
		'repeat',
		'Transport',
		'Toggle Loop',
		'LOOP',
		combineRgb(147, 51, 234),
		combineRgb(255, 255, 255),
		'player_set_repeat',
		{ state: 'toggle', mode: 'loop' },
		[
			{
				feedbackId: 'repeat_mode',
				options: { mode: 'loop' },
				style: { bgcolor: combineRgb(168, 85, 247), color: combineRgb(255, 255, 255) },
			},
		],
	)
	createActionPreset(
		'repeat_fade',
		'Transport',
		'Toggle Loop Fade',
		'LOOP\nFADE',
		combineRgb(126, 34, 206),
		combineRgb(255, 255, 255),
		'player_set_repeat',
		{ state: 'toggle', mode: 'fade' },
		[
			{
				feedbackId: 'repeat_mode',
				options: { mode: 'fade' },
				style: { bgcolor: combineRgb(147, 51, 234), color: combineRgb(255, 255, 255) },
			},
		],
	)
	createActionPreset(
		'repeat_ping_pong',
		'Transport',
		'Toggle Loop Ping-Pong',
		'PING\nPONG',
		combineRgb(109, 40, 217),
		combineRgb(255, 255, 255),
		'player_set_repeat',
		{ state: 'toggle', mode: 'ping-pong' },
		[
			{
				feedbackId: 'repeat_mode',
				options: { mode: 'ping-pong' },
				style: { bgcolor: combineRgb(124, 58, 237), color: combineRgb(255, 255, 255) },
			},
		],
	)
	createActionPreset(
		'shuffle',
		'Transport',
		'Toggle shuffle',
		'SHUFFLE',
		combineRgb(219, 39, 119),
		combineRgb(255, 255, 255),
		'player_set_shuffle',
		{ state: 'toggle' },
		[
			{
				feedbackId: 'shuffle_enabled',
				options: {},
				style: { bgcolor: combineRgb(236, 72, 153), color: combineRgb(255, 255, 255) },
			},
		],
	)

	// ── The two Dual Player gangs ──────────────────────────────────────────
	//
	// Toggle buttons, lit from the app's own state. They take no player: the
	// gangs describe the relationship between the two, so "which player" is not
	// a question they have.
	createActionPreset(
		'dual_sync_transports',
		'Dual Player',
		'Toggle transport sync',
		// The words in full. Abbreviating them saved a line an operator does not
		// need saved: these two buttons sit side by side, and "TRANSP" / "TRANS."
		// are exactly alike at a glance — which is the one thing a pair of
		// buttons that do different things must never be.
		//
		// The break is explicit, as "FULL\nSCREEN" already does here, so the two
		// words stay whole. Left to wrap on the space alone, a fixed size splits
		// the long one mid-word: "TRANS / PORT".
		'SYNC\nTRANSPORT',
		combineRgb(76, 29, 149),
		combineRgb(255, 255, 255),
		'dual_sync_transports',
		{ state: 'toggle' },
		[
			{
				feedbackId: 'dual_sync_transports_enabled',
				options: {},
				style: { bgcolor: combineRgb(139, 92, 246), color: combineRgb(255, 255, 255) },
			},
		],
		// 18, chosen deliberately over 'auto' so these two match the rest of the
		// module rather than sizing themselves. The words are longer than the
		// face can hold on one line, so Companion breaks them — accepted, and
		// preferred here to two buttons that pick their own size.
		'18',
	)
	createActionPreset(
		'dual_sync_transitions',
		'Dual Player',
		'Toggle transition sync',
		'SYNC\nTRANSITION',
		combineRgb(76, 29, 149),
		combineRgb(255, 255, 255),
		'dual_sync_transitions',
		{ state: 'toggle' },
		[
			{
				feedbackId: 'dual_sync_transitions_enabled',
				options: {},
				style: { bgcolor: combineRgb(139, 92, 246), color: combineRgb(255, 255, 255) },
			},
		],
		'18',
	)

	// Jog and cue. The seek presets carry the delta the operator is most likely
	// to want; the action's field is there to change it per button.
	createActionPreset(
		'seek_back_10',
		'Transport',
		'Rewind 10 seconds',
		'⏪\n10s',
		combineRgb(30, 64, 175),
		combineRgb(255, 255, 255),
		'player_seek_relative',
		{ window: 'active', delta: -10 },
		[],
		'14',
	)
	createActionPreset(
		'seek_forward_10',
		'Transport',
		'Forward 10 seconds',
		'⏩\n10s',
		combineRgb(30, 64, 175),
		combineRgb(255, 255, 255),
		'player_seek_relative',
		{ window: 'active', delta: 10 },
		[],
		'14',
	)

	// GOTO jumps to a point measured back from the OUT mark, so the button says
	// how much of the clip is left to run once it lands.
	for (const [id, seconds, label] of [
		['goto_60', 60, "GOTO\n1'"],
		['goto_30', 30, 'GOTO\n30"'],
		['goto_10', 10, 'GOTO\n10"'],
	] as const) {
		createActionPreset(
			id,
			'Transport',
			`Go to ${seconds}s before the end`,
			label,
			combineRgb(180, 83, 9),
			combineRgb(255, 255, 255),
			'player_goto_remaining',
			{ window: 'active', time: seconds },
			[],
			'14',
		)
	}

	createActionPreset(
		'fade_to_alpha',
		'Transport',
		'Fade program to alpha',
		'FADE\nα',
		combineRgb(79, 70, 229),
		combineRgb(255, 255, 255),
		'player_fade_to_alpha',
		{ duration: 1000 },
		[
			{
				feedbackId: 'transition_active',
				options: {},
				style: { bgcolor: combineRgb(245, 158, 11), color: combineRgb(0, 0, 0) },
			},
		],
		'14',
	)
	createActionPreset(
		'eject',
		'Transport',
		'Eject program media',
		'EJECT',
		combineRgb(120, 53, 15),
		combineRgb(255, 255, 255),
		'player_eject',
		{ window: 'program' },
		[],
		'14',
	)

	// Audio. Muted is the loud state on a control surface: red means "this bus
	// is not going out", which is what an operator needs to see from across the
	// room.
	//
	// Both halves of a mute button have to name the same Player — the action
	// that cuts the bus and the feedback that reports it — so they are written
	// together here rather than twice per button.
	function createMutePreset(
		id: string,
		name: string,
		text: string,
		target: 'main' | 'monitor',
		player: 'active' | 'p1' | 'p2',
		size: CompanionTextSize,
	): void {
		createActionPreset(
			id,
			'Audio',
			name,
			text,
			combineRgb(51, 65, 85),
			combineRgb(255, 255, 255),
			'player_set_mute',
			{ target, state: 'toggle', player },
			[
				{
					feedbackId: 'audio_muted',
					options: { target, player },
					style: { bgcolor: combineRgb(220, 38, 38), color: combineRgb(255, 255, 255) },
				},
			],
			size,
		)
	}

	createMutePreset('mute_main', 'Mute the Main Mix (active Player)', 'MUTE', 'main', 'active', '18')
	createMutePreset('mute_main_p1', "Mute Player 1's Main Mix", 'MUTE\nP1', 'main', 'p1', '18')
	createMutePreset('mute_main_p2', "Mute Player 2's Main Mix", 'MUTE\nP2', 'main', 'p2', '18')
	createMutePreset('mute_monitor', 'Mute Monitoring (active Player)', 'MUTE\nMON', 'monitor', 'active', '14')
	createMutePreset('mute_monitor_p1', "Mute Player 1's Monitoring", 'MUTE\nMON P1', 'monitor', 'p1', '14')
	createMutePreset('mute_monitor_p2', "Mute Player 2's Monitoring", 'MUTE\nMON P2', 'monitor', 'p2', '14')

	createActionPreset(
		'window_preview',
		'Windows',
		'Select preview as active window',
		'PREVIEW',
		combineRgb(8, 145, 178),
		combineRgb(255, 255, 255),
		'player_select_window',
		{ window: 'preview' },
		[
			{
				feedbackId: 'active_window',
				options: { window: 'preview' },
				style: { bgcolor: combineRgb(6, 182, 212), color: combineRgb(0, 0, 0) },
			},
		],
		'14',
	)
	createActionPreset(
		'window_program',
		'Windows',
		'Select program as active window',
		'PROGRAM',
		combineRgb(29, 78, 216),
		combineRgb(255, 255, 255),
		'player_select_window',
		{ window: 'program' },
		[
			{
				feedbackId: 'active_window',
				options: { window: 'program' },
				style: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			},
		],
		'14',
	)
	// The caption is the name the operator gave the Player in QPlayer, not the
	// slot number: a surface that says "PLAYER 2" next to an interface that says
	// "Plateau B" is one more thing to translate under pressure. Renaming in the
	// app repaints the button.
	createActionPreset(
		'player_1',
		'Players',
		'Select Player 1',
		variable('p1_player_name'),
		combineRgb(76, 29, 149),
		combineRgb(255, 255, 255),
		'player_select_player',
		{ player: 'p1' },
		[
			{
				feedbackId: 'controlled_player',
				options: { player: 'p1' },
				style: { bgcolor: combineRgb(124, 58, 237), color: combineRgb(255, 255, 255) },
			},
		],
		'14',
	)
	createActionPreset(
		'player_2',
		'Players',
		'Select Player 2',
		variable('p2_player_name'),
		combineRgb(8, 145, 178),
		combineRgb(255, 255, 255),
		'player_select_player',
		{ player: 'p2' },
		[
			{
				feedbackId: 'controlled_player',
				options: { player: 'p2' },
				style: { bgcolor: combineRgb(6, 182, 212), color: combineRgb(0, 0, 0) },
			},
		],
		'14',
	)
	createActionPreset(
		'output_black',
		'Outputs',
		'Switch output to black',
		'BLACK',
		combineRgb(17, 24, 39),
		combineRgb(255, 255, 255),
		'output_black',
		{},
		[
			{
				feedbackId: 'program_mode',
				options: { mode: 'black' },
				style: { bgcolor: combineRgb(0, 0, 0), color: combineRgb(255, 255, 255) },
			},
		],
		'14',
	)
	createActionPreset(
		'output_clock',
		'Outputs',
		'Switch output to clock',
		'CLOCK',
		combineRgb(37, 99, 235),
		combineRgb(255, 255, 255),
		'output_clock',
		{},
		[
			{
				feedbackId: 'program_mode',
				options: { mode: 'clock' },
				style: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			},
		],
		'14',
	)
	createActionPreset(
		'output_logo',
		'Outputs',
		'Switch output to logo',
		'LOGO',
		combineRgb(22, 163, 74),
		combineRgb(255, 255, 255),
		'output_logo',
		{},
		[
			{
				feedbackId: 'program_mode',
				options: { mode: 'logo' },
				style: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			},
		],
		'14',
	)
	createActionPreset(
		'output_pattern',
		'Outputs',
		'Switch output to test pattern',
		'TEST',
		combineRgb(124, 58, 237),
		combineRgb(255, 255, 255),
		'output_pattern',
		{},
		[
			{
				feedbackId: 'program_mode',
				options: { mode: 'testcard' },
				style: { bgcolor: combineRgb(147, 51, 234), color: combineRgb(255, 255, 255) },
			},
		],
		'14',
	)

	// First in Services, because it is the output an operator reaches for most.
	createActionPreset(
		'extended',
		'Services',
		'Toggle the fullscreen output',
		'FULL\nSCREEN',
		combineRgb(51, 65, 85),
		combineRgb(255, 255, 255),
		'player_toggle_extended',
		{},
		[
			{
				feedbackId: 'extended_display_open',
				options: {},
				style: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			},
			// Greyed and dimmed when this Player has no display free to drive.
			// Pressing it then is harmless — QPlayer answers with its display
			// picker — but the button should say so before it is pressed.
			{
				feedbackId: 'extended_display_available',
				options: {},
				isInverted: true,
				style: { bgcolor: combineRgb(31, 41, 55), color: combineRgb(107, 114, 128) },
			},
		],
		// Two lines of eight characters: 18pt would clip, 14 fits.
		'14',
	)

	createActionPreset(
		'ndi_start',
		'Services',
		'Start NDI output',
		'NDI\nON',
		combineRgb(79, 70, 229),
		combineRgb(255, 255, 255),
		'ndi_start',
		{},
		[
			{
				feedbackId: 'ndi_running',
				options: {},
				style: { bgcolor: combineRgb(99, 102, 241), color: combineRgb(255, 255, 255) },
			},
		],
	)
	createActionPreset(
		'ndi_stop',
		'Services',
		'Stop NDI output',
		'NDI\nOFF',
		combineRgb(55, 48, 163),
		combineRgb(255, 255, 255),
		'ndi_stop',
	)
	createActionPreset(
		'omt_start',
		'Services',
		'Start OMT output',
		'OMT\nON',
		combineRgb(13, 148, 136),
		combineRgb(0, 0, 0),
		'omt_start',
		{},
		[
			{
				feedbackId: 'omt_running',
				options: {},
				style: { bgcolor: combineRgb(20, 184, 166), color: combineRgb(0, 0, 0) },
			},
		],
	)
	createActionPreset(
		'omt_stop',
		'Services',
		'Stop OMT output',
		'OMT\nOFF',
		combineRgb(15, 118, 110),
		combineRgb(255, 255, 255),
		'omt_stop',
	)
	createActionPreset(
		'monitor_open',
		'Services',
		'Open monitor window',
		'MON\nOPEN',
		combineRgb(14, 165, 233),
		combineRgb(255, 255, 255),
		'monitor_window_open',
		{ fullscreen: 'on' },
		[
			{
				feedbackId: 'monitor_available',
				options: {},
				style: { bgcolor: combineRgb(56, 189, 248), color: combineRgb(0, 0, 0) },
			},
		],
	)

	createReadoutPreset(
		'readout_remaining',
		'Active remaining time',
		variable('remaining_formatted'),
		combineRgb(22, 163, 74),
		'24',
		// No numbers here on purpose: the button paints itself with the amber and
		// red the operator already set in QPlayer's Settings panel, and switching
		// the feedback to "Custom values" is what un-ties it.
		[{ feedbackId: 'remaining_time_dynamic', options: { window: 'active', source: 'app' } }],
	)
	createReadoutPreset(
		'readout_elapsed',
		'Active elapsed time',
		variable('elapsed_formatted'),
		combineRgb(30, 41, 59),
		'18',
	)
	createReadoutPreset('readout_media', 'Active media name', variable('active_media_name'), combineRgb(15, 23, 42), '14')
	createReadoutPreset(
		'readout_playlist',
		'Active playlist name',
		variable('active_playlist_name'),
		combineRgb(76, 29, 149),
		'14',
	)
	createReadoutPreset(
		'readout_preview_remaining',
		'Preview remaining time',
		`PREV\n${variable('preview_remaining_formatted')}`,
		combineRgb(8, 145, 178),
		'14',
		[{ feedbackId: 'remaining_time_dynamic', options: { window: 'preview', source: 'app' } }],
	)
	createReadoutPreset(
		'readout_program_remaining',
		'Program remaining time',
		`PGM\n${variable('program_remaining_formatted')}`,
		combineRgb(29, 78, 216),
		'14',
		[{ feedbackId: 'remaining_time_dynamic', options: { window: 'program', source: 'app' } }],
	)
	createReadoutPreset(
		'readout_playlist_loops',
		'Playlist laps',
		`LAPS\n${variable('playlist_loop_count')}`,
		combineRgb(8, 145, 178),
		'18',
	)
	createReadoutPreset(
		'readout_program_mode',
		'Program mode',
		`MODE\n${variable('program_mode_label')}`,
		combineRgb(51, 65, 85),
		'14',
	)

	// The four "Ready Page - *" categories used to hold copies of the presets
	// above under different ids, so every button appeared twice in the picker
	// and editing one changed nothing about the other. Each button now exists
	// once, in the category that describes what it does.

	self.setPresetDefinitions(presets)
}
