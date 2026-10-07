export const WINDOW_CHOICES = [
	{ id: 'preview', label: 'Preview' },
	{ id: 'program', label: 'Program' },
] as const

export const PLAYER_CHOICES = [
	{ id: 'p1', label: 'Player 1' },
	{ id: 'p2', label: 'Player 2' },
] as const

export const PLAYER_WITH_ACTIVE_CHOICES = [
	{ id: 'active', label: 'Player currently controlled in QPlayer' },
	...PLAYER_CHOICES,
] as const

/**
 * Per-action Player targeting, mirroring the HTTP API.
 *
 * 'active' resolves the same way the API does when a request names no Player,
 * so a button left on the default follows whichever Player QPlayer is driving.
 * A connection pinned to one Player in its config still wins over 'active' —
 * pinning it is a deliberate statement about the whole connection.
 */
export const ACTION_PLAYER_CHOICES = [
	{ id: 'active', label: 'Active Player' },
	{ id: 'p1', label: 'Player 1' },
	{ id: 'p2', label: 'Player 2' },
] as const

export const LOOP_MODE_CHOICES = [
	{ id: 'loop', label: 'Loop' },
	{ id: 'fade', label: 'Loop Fade' },
	{ id: 'ping-pong', label: 'Loop Ping-Pong' },
] as const

export const LOOP_ITEM_MODE_CHOICES = [{ id: 'off', label: 'Off' }, ...LOOP_MODE_CHOICES] as const

export const WINDOW_WITH_ACTIVE_CHOICES = [{ id: 'active', label: 'Active window' }, ...WINDOW_CHOICES] as const

export const WINDOW_SELECT_CHOICES = [{ id: 'toggle', label: 'Toggle active window' }, ...WINDOW_CHOICES] as const

export const TOGGLE_CHOICES = [
	{ id: 'toggle', label: 'Toggle' },
	{ id: 'on', label: 'Force on' },
	{ id: 'off', label: 'Force off' },
] as const

/**
 * Which of a Player's two audio buses a mute applies to.
 *
 * They are separate switches in QPlayer — the programme leaving the sound card,
 * and the Preview listen — so a button has to say which one it means.
 */
// Named as the application's audio panel names them, so an operator setting up
// a button is choosing between two things they have already seen.
export const MUTE_TARGET_CHOICES = [
	{ id: 'main', label: 'Main Mix' },
	{ id: 'monitor', label: 'Monitoring' },
] as const

export const REMAINING_THRESHOLD_SOURCE_CHOICES = [
	{ id: 'app', label: 'Follow QPlayer settings' },
	{ id: 'custom', label: 'Custom values' },
] as const

export const MONITOR_WINDOW_ACTION_CHOICES = [
	{ id: 'toggle', label: 'Toggle' },
	{ id: 'open', label: 'Open' },
	{ id: 'close', label: 'Close' },
] as const

export const ON_OFF_CHOICES = [
	{ id: 'on', label: 'On' },
	{ id: 'off', label: 'Off' },
] as const

export const PROGRAM_MODE_CHOICES = [
	{ id: 'none', label: 'Media only' },
	{ id: 'black', label: 'Black' },
	{ id: 'clock', label: 'Clock' },
	{ id: 'logo', label: 'Logo' },
	{ id: 'testcard', label: 'Test pattern' },
] as const

export const OUTPUT_MODE_CHOICES = [
	{ id: 'black', label: 'Black' },
	{ id: 'clock', label: 'Clock' },
	{ id: 'logo', label: 'Logo' },
	{ id: 'testcard', label: 'Test pattern' },
] as const

export const TRANSITION_CHOICES = [
	{ id: 'fade', label: 'Fade' },
	{ id: 'cut', label: 'Cut' },
] as const

export const MATCH_CHOICES = [
	{ id: 'exact', label: 'Exact match' },
	{ id: 'contains', label: 'Contains' },
	{ id: 'startsWith', label: 'Starts with' },
	{ id: 'endsWith', label: 'Ends with' },
] as const

export const COMPARISON_CHOICES = [
	{ id: 'lt', label: '<' },
	{ id: 'lte', label: '<=' },
	{ id: 'eq', label: '=' },
	{ id: 'gte', label: '>=' },
	{ id: 'gt', label: '>' },
] as const

export const MEDIA_TYPE_CHOICES = [
	{ id: 'video', label: 'Video' },
	{ id: 'image', label: 'Image' },
	{ id: 'audio', label: 'Audio' },
	{ id: 'blank', label: 'Blank' },
	{ id: 'none', label: 'No media loaded' },
] as const

export const VOLUME_TARGET_CHOICES = [
	{ id: 'master', label: 'Master / program mix' },
	{ id: 'preview', label: 'Preview' },
	{ id: 'program', label: 'Program' },
] as const

export const PLAYLIST_END_ACTION_CHOICES = [
	{ id: 'stop', label: 'Stop' },
	{ id: 'loop', label: 'Loop playlist' },
	{ id: 'jump', label: 'Jump to another playlist' },
	{ id: 'playMedia', label: 'Play another media item' },
] as const

export const OMT_QUALITY_CHOICES = [
	{ id: 'default', label: 'Default' },
	{ id: 'high', label: 'High' },
	{ id: 'medium', label: 'Medium' },
	{ id: 'low', label: 'Low' },
] as const

export const AUDIO_METER_CHOICES = [
	{ id: 'left', label: 'Left' },
	{ id: 'right', label: 'Right' },
	{ id: 'leftPeak', label: 'Left peak' },
	{ id: 'rightPeak', label: 'Right peak' },
] as const

export const MARK_STATE_CHOICES = [
	{ id: 'in', label: 'Mark in set' },
	{ id: 'out', label: 'Mark out set' },
	{ id: 'both', label: 'Both marks set' },
] as const
