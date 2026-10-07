import type { CompanionVariableDefinition } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

/** Values that describe the connection itself, not a playback channel. */
const CONNECTION_VARIABLES: CompanionVariableDefinition[] = [
	{ variableId: 'connection_status', name: 'Connection status' },
	{ variableId: 'websocket_connected', name: 'WebSocket connected' },
	{ variableId: 'server_url', name: 'Server URL' },
	{ variableId: 'last_updated', name: 'Last updated timestamp' },
	{ variableId: 'network_primary_ip', name: 'Primary IP address' },
	{ variableId: 'network_hostname', name: 'Hostname' },
	{ variableId: 'network_port', name: 'API port' },
	{ variableId: 'player_id', name: 'Controlled Player ID' },
	{ variableId: 'player_name', name: 'Controlled Player name' },
	{ variableId: 'dual_player_enabled', name: 'Dual Player mode enabled' },
	{ variableId: 'link_role', name: 'QPlayer Link role (off, main, spare or backup)' },
	{ variableId: 'link_instance_id', name: 'QPlayer Link instance ID' },
	{ variableId: 'link_instance_name', name: 'QPlayer Link instance name' },
	{ variableId: 'link_master_id', name: 'Assigned MASTER ID' },
	{ variableId: 'link_master_name', name: 'Assigned MASTER name' },
	{ variableId: 'monitor_available', name: 'Monitor window target available' },
	{ variableId: 'monitor_display_id', name: 'Monitor target display ID' },
	{ variableId: 'monitor_display_name', name: 'Monitor target display name' },
	{ variableId: 'monitor_display_resolution', name: 'Monitor target display resolution' },
	// The application's own readout thresholds, as set in its Settings panel.
	// The mode names the unit: seconds of countdown, or percent of the item.
	{ variableId: 'remaining_warn_threshold', name: 'Remaining time warn threshold (QPlayer setting)' },
	{ variableId: 'remaining_alert_threshold', name: 'Remaining time alert threshold (QPlayer setting)' },
	{ variableId: 'remaining_threshold_mode', name: 'Remaining time threshold mode (seconds or percent)' },
]

/**
 * Values that describe one Player.
 *
 * Published three times: unprefixed for the Player this connection watches, and
 * under `p1_` / `p2_` for each Player by name, so one connection can drive a
 * readout for either. Kept in step with ModuleInstance.buildPlayerVariables by
 * test, since a name here without a value there shows the operator an empty
 * variable and a value without a name here hides it from the picker.
 */
export const PLAYER_VARIABLES: CompanionVariableDefinition[] = [
	{ variableId: 'active_window', name: 'Active window' },
	{ variableId: 'active_is_playing', name: 'Active window is playing' },
	{ variableId: 'preview_playing', name: 'Preview is playing' },
	{ variableId: 'program_playing', name: 'Program is playing' },
	{ variableId: 'repeat_enabled', name: 'Repeat enabled' },
	{ variableId: 'repeat_mode', name: 'Repeat mode (loop, fade or ping-pong)' },
	{ variableId: 'playback_direction', name: 'Active playback direction' },
	{ variableId: 'loop_count', name: 'Completed loop or Ping-Pong round-trip count' },
	{ variableId: 'loop_limit', name: 'Configured loop count limit' },
	{ variableId: 'playlist_loop_count', name: 'Laps of the active playlist (end action: Loop)' },
	{ variableId: 'shuffle_enabled', name: 'Shuffle enabled' },
	{ variableId: 'transition_type', name: 'Transition type' },
	{ variableId: 'transition_duration_ms', name: 'Transition duration in ms' },
	{ variableId: 'transition_active', name: 'Transition active' },
	{ variableId: 'program_mode', name: 'Program mode' },
	{ variableId: 'program_mode_label', name: 'Program mode as an upper-case caption' },
	{ variableId: 'current_time_seconds', name: 'Active window current time in seconds' },
	{ variableId: 'current_time_formatted', name: 'Active window current time formatted' },
	{ variableId: 'duration_seconds', name: 'Active window duration in seconds' },
	{ variableId: 'duration_formatted', name: 'Active window duration formatted' },
	{ variableId: 'remaining_seconds', name: 'Active window remaining time in seconds' },
	{ variableId: 'remaining_formatted', name: 'Active window remaining time formatted' },
	{ variableId: 'elapsed_seconds', name: 'Active window elapsed time in seconds' },
	{ variableId: 'elapsed_formatted', name: 'Active window elapsed time formatted' },
	{ variableId: 'progress_percent', name: 'Active window progress percent' },
	{ variableId: 'mark_in_seconds', name: 'Mark in in seconds' },
	{ variableId: 'mark_out_seconds', name: 'Mark out in seconds' },
	{ variableId: 'cue_duration_seconds', name: 'Cue duration in seconds' },
	{ variableId: 'cue_remaining_seconds', name: 'Cue remaining time in seconds' },
	{ variableId: 'program_offset_countdown_seconds', name: 'Program offset countdown in seconds' },
	{ variableId: 'active_media_name', name: 'Active media name' },
	{ variableId: 'active_media_path', name: 'Active media path' },
	{ variableId: 'active_media_type', name: 'Active media type' },
	{ variableId: 'active_media_duration_seconds', name: 'Active media duration in seconds' },
	{ variableId: 'active_media_playback_rate', name: 'Active media playback rate' },
	{ variableId: 'preview_media_name', name: 'Preview media name' },
	{ variableId: 'preview_media_path', name: 'Preview media path' },
	{ variableId: 'preview_media_type', name: 'Preview media type' },
	{ variableId: 'preview_media_duration_seconds', name: 'Preview media duration in seconds' },
	{ variableId: 'preview_media_playback_rate', name: 'Preview media playback rate' },
	{ variableId: 'preview_time_seconds', name: 'Preview current time in seconds' },
	{ variableId: 'preview_mark_in_seconds', name: 'Preview Mark IN in seconds' },
	{ variableId: 'preview_mark_out_seconds', name: 'Preview Mark OUT in seconds' },
	{ variableId: 'preview_remaining_seconds', name: 'Preview remaining time in seconds' },
	{ variableId: 'preview_remaining_formatted', name: 'Preview remaining time formatted' },
	{ variableId: 'program_media_name', name: 'Program media name' },
	{ variableId: 'program_media_path', name: 'Program media path' },
	{ variableId: 'program_media_type', name: 'Program media type' },
	{ variableId: 'program_media_duration_seconds', name: 'Program media duration in seconds' },
	{ variableId: 'program_media_playback_rate', name: 'Program media playback rate' },
	{ variableId: 'program_time_seconds', name: 'Program current time in seconds' },
	{ variableId: 'program_mark_in_seconds', name: 'Program Mark IN in seconds' },
	{ variableId: 'program_mark_out_seconds', name: 'Program Mark OUT in seconds' },
	{ variableId: 'program_remaining_seconds', name: 'Program remaining time in seconds' },
	{ variableId: 'program_remaining_formatted', name: 'Program remaining time formatted' },
	{ variableId: 'selected_media_name', name: 'Selected media name' },
	{ variableId: 'selected_media_path', name: 'Selected media path' },
	{ variableId: 'selected_media_type', name: 'Selected media type' },
	{ variableId: 'playlist_count', name: 'Playlist count' },
	{ variableId: 'active_playlist_id', name: 'Active playlist ID' },
	{ variableId: 'active_playlist_name', name: 'Active playlist name' },
	{ variableId: 'active_playlist_index', name: 'Active playlist index' },
	{ variableId: 'active_playlist_item_count', name: 'Active playlist item count' },
	{ variableId: 'preview_playlist_name', name: 'Preview playlist name' },
	{ variableId: 'preview_playlist_index', name: 'Preview playlist index' },
	{ variableId: 'preview_item_index', name: 'Preview item index inside its playlist' },
	{ variableId: 'program_playlist_name', name: 'Program playlist name' },
	{ variableId: 'program_playlist_index', name: 'Program playlist index' },
	{ variableId: 'program_item_index', name: 'Program item index inside its playlist' },
	{ variableId: 'master_volume_percent', name: 'Master volume percent' },
	{ variableId: 'preview_volume_percent', name: 'Preview volume percent' },
	{ variableId: 'program_volume_percent', name: 'Program volume percent' },
	{ variableId: 'audio_preview_left', name: 'Preview audio left level' },
	{ variableId: 'audio_preview_right', name: 'Preview audio right level' },
	{ variableId: 'audio_preview_left_peak', name: 'Preview audio left peak level' },
	{ variableId: 'audio_preview_right_peak', name: 'Preview audio right peak level' },
	{ variableId: 'audio_program_left', name: 'Program audio left level' },
	{ variableId: 'audio_program_right', name: 'Program audio right level' },
	{ variableId: 'audio_program_left_peak', name: 'Program audio left peak level' },
	{ variableId: 'audio_program_right_peak', name: 'Program audio right peak level' },
	{ variableId: 'ndi_enabled', name: 'NDI enabled' },
	{ variableId: 'ndi_running', name: 'NDI running' },
	{ variableId: 'ndi_source_name', name: 'NDI source name' },
	{ variableId: 'ndi_resolution', name: 'NDI resolution' },
	{ variableId: 'ndi_frame_rate', name: 'NDI frame rate' },
	{ variableId: 'ndi_alpha_mode', name: 'NDI alpha mode' },
	{ variableId: 'omt_available', name: 'OMT available' },
	{ variableId: 'omt_enabled', name: 'OMT enabled' },
	{ variableId: 'omt_running', name: 'OMT running' },
	{ variableId: 'omt_source_name', name: 'OMT source name' },
	{ variableId: 'omt_resolution', name: 'OMT resolution' },
	{ variableId: 'omt_frame_rate', name: 'OMT frame rate' },
	{ variableId: 'omt_quality', name: 'OMT quality' },
	{ variableId: 'main_output_muted', name: 'Main output is muted' },
	{ variableId: 'monitoring_muted', name: 'Monitoring (Preview listen) is muted' },
	{ variableId: 'extended_display_available', name: 'Extended (fullscreen) output can be driven' },
	{ variableId: 'extended_display_open', name: 'Extended (fullscreen) output is open' },
	{ variableId: 'extended_display_reason', name: 'Why the extended output is unavailable' },
]

export const PLAYER_VARIABLE_PREFIXES = ['p1', 'p2'] as const

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const definitions: CompanionVariableDefinition[] = [...CONNECTION_VARIABLES, ...PLAYER_VARIABLES]

	for (const player of PLAYER_VARIABLE_PREFIXES) {
		const label = player === 'p2' ? 'Player 2' : 'Player 1'
		definitions.push({ variableId: `${player}_player_name`, name: `${label} name` })
		for (const variable of PLAYER_VARIABLES) {
			definitions.push({ variableId: `${player}_${variable.variableId}`, name: `${label}: ${variable.name}` })
		}
	}

	self.setVariableDefinitions(definitions)
}
