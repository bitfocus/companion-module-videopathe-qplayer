import type { CompanionVariableValues } from '@companion-module/base'
import {
	type QPlayerNdiStatus,
	type QPlayerOmtStatus,
	type QPlayerStateSnapshot,
	findMediaLocation,
	formatDuration,
	getActiveMedia,
	getActivePlaylist,
	getActiveWindow,
	getCueDuration,
	getCueRemaining,
	getMediaDisplayName,
	getMediaDuration,
	getMediaType,
	getPlaylistIndex,
	getProgramOffsetCountdownSeconds,
	getWindowBounds,
	getWindowDuration,
	getWindowPlaybackRate,
	getWindowRemaining,
	getWindowTime,
	programModeLabel,
	safeNumber,
	safeString,
} from './state.js'

/**
 * Everything that describes one Player's channel.
 *
 * Emitted three times: once unprefixed for the Player this connection
 * watches — the names every existing button already references — and once
 * under `p1_` and `p2_` so a readout can name a Player and a surface without
 * needing a second connection.
 */
export function buildPlayerVariables(
	state: QPlayerStateSnapshot | undefined,
	ndi: QPlayerNdiStatus | undefined,
	omt: QPlayerOmtStatus | undefined,
	progressPercent: number,
): CompanionVariableValues {
	const activeWindow = getActiveWindow(state)
	const activeMedia = getActiveMedia(state)
	const activeDuration = getWindowDuration(state, activeWindow)
	const activeCurrentTime = getWindowTime(state, activeWindow)
	const activeBounds = getWindowBounds(state, activeWindow)
	const activeElapsed = Math.max(0, Math.min(activeBounds.outPoint, activeCurrentTime) - activeBounds.inPoint)
	const activeRemaining = getWindowRemaining(state, activeWindow)
	const previewCurrentTime = getWindowTime(state, 'preview')
	const previewRemaining = getWindowRemaining(state, 'preview')
	const programCurrentTime = getWindowTime(state, 'program')
	const programRemaining = getWindowRemaining(state, 'program')
	const previewMedia = state?.previewMedia ?? undefined
	const programMedia = state?.programMedia ?? undefined
	const selectedMedia = state?.selectedMedia ?? undefined
	const playlists = Array.isArray(state?.playlists) ? state.playlists : []
	const activePlaylist = getActivePlaylist(playlists, state?.activePlaylist)
	const previewLocation = findMediaLocation(playlists, previewMedia)
	const programLocation = findMediaLocation(playlists, programMedia)
	const previewPlaylistIndex = previewLocation ? getPlaylistIndex(playlists, previewLocation.playlist.id) : -1
	const programPlaylistIndex = programLocation ? getPlaylistIndex(playlists, programLocation.playlist.id) : -1
	const activePlaylistIndex = activePlaylist ? getPlaylistIndex(playlists, activePlaylist.id) : -1
	const previewDuration = getWindowDuration(state, 'preview')
	const programDuration = getWindowDuration(state, 'program')
	const previewBounds = getWindowBounds(state, 'preview')
	const programBounds = getWindowBounds(state, 'program')
	const masterVolumePercent = Math.round(safeNumber(state?.volume, safeNumber(state?.programVolume)) * 100)
	const previewVolumePercent = Math.round(safeNumber(state?.previewVolume) * 100)
	const programVolumePercent = Math.round(safeNumber(state?.programVolume, safeNumber(state?.volume)) * 100)

	return {
		active_window: activeWindow,
		active_is_playing: state?.isPlaying === true,
		preview_playing: state?.isPreviewPlaying === true,
		program_playing: state?.isProgramPlaying === true,
		repeat_enabled: state?.repeatEnabled === true,
		repeat_mode: safeString(state?.repeatMode, 'loop'),
		playback_direction: state?.playbackDirections?.[activeWindow] ?? state?.playbackDirection ?? 'forward',
		loop_count: safeNumber(state?.loopCount),
		loop_limit: safeNumber(state?.loopLimit),
		playlist_loop_count: safeNumber(state?.playlistLoopCount),
		shuffle_enabled: state?.shuffleEnabled === true,
		transition_type: safeString(state?.transitionType),
		transition_duration_ms: safeNumber(state?.transitionDuration),
		transition_active: state?.isTransitioning === true,
		program_mode: safeString(state?.programMode),
		program_mode_label: programModeLabel(state?.programMode),
		current_time_seconds: activeCurrentTime,
		current_time_formatted: formatDuration(activeCurrentTime, activeDuration >= 3600),
		duration_seconds: activeDuration,
		duration_formatted: formatDuration(activeDuration, activeDuration >= 3600),
		remaining_seconds: activeRemaining,
		remaining_formatted: formatDuration(activeRemaining, activeDuration >= 3600),
		elapsed_seconds: activeElapsed,
		elapsed_formatted: formatDuration(activeElapsed, activeBounds.duration >= 3600),
		progress_percent: progressPercent,
		mark_in_seconds: activeBounds.inPoint,
		mark_out_seconds: activeBounds.outPoint,
		cue_duration_seconds: getCueDuration(state),
		cue_remaining_seconds: getCueRemaining(state),
		program_offset_countdown_seconds: getProgramOffsetCountdownSeconds(state?.programOffsetCountdownDeadline),
		active_media_name: getMediaDisplayName(activeMedia),
		active_media_path: safeString(activeMedia?.path),
		active_media_type: getMediaType(activeMedia),
		active_media_duration_seconds: getMediaDuration(activeMedia),
		active_media_playback_rate: getWindowPlaybackRate(state, activeWindow),
		preview_media_name: getMediaDisplayName(previewMedia),
		preview_media_path: safeString(previewMedia?.path),
		preview_media_type: getMediaType(previewMedia),
		preview_media_duration_seconds: getMediaDuration(previewMedia),
		preview_media_playback_rate: getWindowPlaybackRate(state, 'preview'),
		preview_time_seconds: previewCurrentTime,
		preview_mark_in_seconds: previewBounds.inPoint,
		preview_mark_out_seconds: previewBounds.outPoint,
		preview_remaining_seconds: previewRemaining,
		preview_remaining_formatted: formatDuration(previewRemaining, previewDuration >= 3600),
		program_media_name: getMediaDisplayName(programMedia),
		program_media_path: safeString(programMedia?.path),
		program_media_type: getMediaType(programMedia),
		program_media_duration_seconds: getMediaDuration(programMedia),
		program_media_playback_rate: getWindowPlaybackRate(state, 'program'),
		program_time_seconds: programCurrentTime,
		program_mark_in_seconds: programBounds.inPoint,
		program_mark_out_seconds: programBounds.outPoint,
		program_remaining_seconds: programRemaining,
		program_remaining_formatted: formatDuration(programRemaining, programDuration >= 3600),
		selected_media_name: getMediaDisplayName(selectedMedia),
		selected_media_path: safeString(selectedMedia?.path),
		selected_media_type: getMediaType(selectedMedia),
		playlist_count: playlists.length,
		active_playlist_id: safeString(activePlaylist?.id),
		active_playlist_name: safeString(activePlaylist?.name),
		active_playlist_index: activePlaylistIndex,
		active_playlist_item_count: Array.isArray(activePlaylist?.items) ? (activePlaylist?.items?.length ?? 0) : 0,
		preview_playlist_name: safeString(previewLocation?.playlist?.name),
		preview_playlist_index: previewPlaylistIndex,
		preview_item_index: previewLocation?.index ?? -1,
		program_playlist_name: safeString(programLocation?.playlist?.name),
		program_playlist_index: programPlaylistIndex,
		program_item_index: programLocation?.index ?? -1,
		master_volume_percent: masterVolumePercent,
		preview_volume_percent: previewVolumePercent,
		program_volume_percent: programVolumePercent,
		audio_preview_left: safeNumber(state?.audioMeters?.preview?.left),
		audio_preview_right: safeNumber(state?.audioMeters?.preview?.right),
		audio_preview_left_peak: safeNumber(state?.audioMeters?.preview?.leftPeak),
		audio_preview_right_peak: safeNumber(state?.audioMeters?.preview?.rightPeak),
		audio_program_left: safeNumber(state?.audioMeters?.program?.left),
		audio_program_right: safeNumber(state?.audioMeters?.program?.right),
		audio_program_left_peak: safeNumber(state?.audioMeters?.program?.leftPeak),
		audio_program_right_peak: safeNumber(state?.audioMeters?.program?.rightPeak),
		ndi_enabled: ndi?.enabled === true,
		ndi_running: ndi?.running === true,
		ndi_source_name: safeString(ndi?.sourceName),
		ndi_resolution: safeString(ndi?.resolution || ndi?.configuredResolution),
		ndi_frame_rate: safeNumber(ndi?.frameRate),
		ndi_alpha_mode: safeString(ndi?.alphaMode),
		omt_available: omt?.available === true,
		omt_enabled: omt?.enabled === true || omt?.running === true,
		omt_running: omt?.running === true,
		omt_source_name: safeString(omt?.sourceName),
		omt_resolution: safeString(omt?.resolution),
		omt_frame_rate: safeNumber(omt?.frameRate),
		omt_quality: safeString(omt?.quality),
		main_output_muted: state?.mainMixEnabled === false,
		monitoring_muted: state?.monitoringEnabled === false,
		extended_display_available: state?.extendedDisplay?.available === true,
		extended_display_open: state?.extendedDisplay?.open === true,
		extended_display_reason: safeString(state?.extendedDisplay?.reason),
	}
}
