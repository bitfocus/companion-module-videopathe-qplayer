A [Bitfocus Companion](https://bitfocus.io/companion) module to control **QPlayer**, the dual-player video
playback application for Windows and macOS, over its local HTTP and WebSocket API.

QPlayer is available on [videopathe.com](https://videopathe.com).

See [HELP.md](./companion/HELP.md) for the in-Companion help page, and [LICENSE](./LICENSE).

## Scope

The module targets the API exposed by QPlayer on port `2224`. It uses a **hybrid** model: a WebSocket carries
the live state stream — playhead, transport, audio meters — while a polling tick fills in what the socket
does not push (`/api/status`, network info, per-Player NDI and OMT status, the monitor-window target and the
media library).

The host starts blank: no HTTP or WebSocket requests are sent before it is configured.
The default poll interval is `1000 ms`. Whenever the socket is open and pushing, it owns the transport
values, so the polled snapshot never walks the playhead backwards. The socket reconnects on its own, and the
poll keeps the connection alive if the socket cannot be established at all.

It covers:

- Player 1, Player 2, or the Player currently controlled in QPlayer — per connection **and** per button
- transport, seek (absolute, percent, relative, and measured back from the OUT mark), marks, volume and
  playback rate, per window (Preview / Program)
- Preview/Program selection, Take, Cut, Fade and Fade to Alpha
- Loop, Loop Fade and Loop Ping-Pong, plus per-playlist-item loop modes with round-trip counts
- Dual Player gangs: sync transports and sync transitions between the two Players
- playlist and media-library loading by name, ID, index or path, with dropdowns rebuilt from QPlayer
- playlist properties (global loop, autoplay, end-of-playlist action) and per-item properties (disabled,
  auto next, loop, rate, offset, colour, transition)
- Black, Clock, Logo and Test Pattern output modes
- per-Player NDI and OMT initialise / start / stop, with status
- fullscreen (extended) output per Player, and the monitoring window
- audio mute on the two buses the application names — Main Mix and Monitoring
- 72 actions, 34 feedbacks, 318 variables and 50 ready-made presets

## Requirements

- QPlayer running on Windows or macOS
- Companion 4.2 or later
- Companion on the same machine as QPlayer, or on any machine that can reach it on the network — see
  [Remote access and the API PIN](#remote-access-and-the-api-pin)

## Setup

1. Start QPlayer.
2. In Companion, add a **Videopathe: QPlayer** connection and fill in:

| Field                                    | Default   | Description                                                             |
| ---------------------------------------- | --------- | ----------------------------------------------------------------------- |
| **QPlayer host**                         | _(blank)_ | Enter `127.0.0.1` for local QPlayer, or the remote computer IP/hostname |
| **Player controlled by this connection** | Active    | Which Player this connection watches — see below                        |
| **API PIN**                              | _(blank)_ | Leave blank unless QPlayer has a PIN set in Settings > Security         |
| **QPlayer port**                         | `2224`    | QPlayer HTTP / WebSocket API port                                       |
| **Poll interval (ms)**                   | `1000`    | Refresh rate for what the WebSocket does not push. Minimum `250`        |

3. Save, and confirm the connection reaches the `ok` status.
4. Drag presets from the module onto your buttons.

## Targeting a Player

QPlayer drives two Players, and the module addresses them at two levels.

**The connection setting** decides which Player this connection _watches_: its unprefixed variables, its
feedbacks and its NDI/OMT status polling.

- `Player currently controlled in QPlayer` follows QPlayer's active Player.
- `Player 1` and `Player 2` pin the connection to that Player.

**Each button** carries its own **Target Player** dropdown (`Active Player`, `Player 1`, `Player 2`) on every
action and feedback that addresses a playback channel. `Active Player` behaves exactly as the HTTP API does
for a request that names no Player. Pinning the connection also pins what `Active Player` resolves to.

So a single connection can carry dedicated P1 and P2 button banks; two connections are only needed when you
want two independent _watched_ states — for example two sets of readouts fed by the unprefixed variables.

Actions that belong to the application rather than to one channel — playlist selection and item properties,
library removal, the monitoring window — have no Target Player dropdown.

### Dual Player gangs

`Sync transports` and `Sync transitions` describe the relationship _between_ the two Players.

- **Sync transports** — Play, Pause, Stop, Seek, Speed, Eject, Loop and Next / Previous act on both Players.
  Each one navigates its **own** playlist.
- **Sync transitions** — TAKE, CUT, FADE, Fade to Alpha and the output modes fire at the same instant on
  both, each Player taking its **own** PVW. Both engines are primed before either starts, which is what makes
  the two simultaneous rather than merely close. Needs the 2 Players view in QPlayer.

Both default to **Toggle**; **On** and **Off** are there for macros, which cannot know which way a toggle
will land. Their presets light from QPlayer's own state, so a gang switched from the application's toolbar is
reflected on the button.

## Actions

Every action marked ▸ also carries the **Target Player** dropdown described above.

### Transport

| Action                             | Options                                      | Notes                                             |
| ---------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| ▸ Player: Play / Pause / Stop      | target window                                | Window: Active / Preview / Program                |
| ▸ Player: Seek to time             | window, time (s)                             |                                                   |
| ▸ Player: Seek to percent          | window, percent                              |                                                   |
| ▸ Player: Seek relative            | window, delta (s)                            | Jog — a negative delta rewinds                    |
| ▸ Player: Go to remaining time     | window, remaining (s)                        | Jumps to a point measured back from the OUT mark  |
| ▸ Player: Next / Previous item     | —                                            |                                                   |
| ▸ Player: Set playback rate        | window, rate                                 |                                                   |
| ▸ Player: Set volume               | target (Master / Preview / Program), percent |                                                   |
| ▸ Player: Mute audio               | bus (Main Mix / Monitoring), toggle/on/off   | The two buses the application's audio panel names |
| ▸ Player: Set shuffle              | toggle / on / off                            |                                                   |
| ▸ Player: Eject window media       | window                                       |                                                   |
| General: Refresh QPlayer state now | —                                            | Forces an immediate poll                          |

### Windows and transitions

| Action                                 | Options                    | Notes                                           |
| -------------------------------------- | -------------------------- | ----------------------------------------------- |
| ▸ Player: Select active window         | toggle / Preview / Program |                                                 |
| ▸ Player: Take                         | —                          | Preview → Program, using the default transition |
| ▸ Player: Cut                          | —                          |                                                 |
| ▸ Player: Fade                         | duration (ms)              |                                                 |
| ▸ Player: Fade to alpha                | duration (ms)              |                                                 |
| ▸ Player: Set default transition       | Fade / Cut, duration (ms)  |                                                 |
| ▸ Player: Toggle extended display      | —                          | The fullscreen output for that Player           |
| ▸ Player: Screenshot preview / program | —                          |                                                 |
| Monitor: Open, close or toggle         | action, fullscreen         | The monitoring window; QPlayer resolves toggles |

### Marks and loops

| Action                             | Options                                           | Notes                                                                  |
| ---------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| ▸ Player: Set mark in / mark out   | window, time in seconds (`-1` = current position) |                                                                        |
| ▸ Player: Clear marks              | —                                                 |                                                                        |
| ▸ Player: Go to mark in / mark out | —                                                 |                                                                        |
| ▸ Player: Set loop                 | loop state (toggle/on/off), mode                  | Modes: Loop, Loop Fade, Loop Ping-Pong                                 |
| Playlist item: Set loop mode       | item, mode (Off / Loop / Fade / Ping-Pong), count | `-1` = infinite. In Ping-Pong a loop is one forward/reverse round trip |

### Dual Player

Neither takes a Target Player: they describe the relationship _between_ the two Players.

| Action                        | Options           | Notes                                       |
| ----------------------------- | ----------------- | ------------------------------------------- |
| Dual Player: Sync transports  | toggle / on / off | See [Dual Player gangs](#dual-player-gangs) |
| Dual Player: Sync transitions | toggle / on / off |                                             |

### Loading media

Playlist, media and library dropdowns are rebuilt from QPlayer as its content changes. Each one has an
**override** text field beside it, so a button can name an ID or a path directly — useful when the target
does not exist yet at the moment the button is built.

| Action                               | Options                                                  | Notes |
| ------------------------------------ | -------------------------------------------------------- | ----- |
| ▸ Player: Play / Load playlist index | playlist (+ ID override), index (0-based), window        |       |
| ▸ Player: Play playlist              | playlist (+ ID override), start index, window            |       |
| ▸ Player: Play / Load playlist media | playlist media (+ playlist & media ID overrides), window |       |
| ▸ Library: Play / Load item          | library item (+ ID override, path override), window      |       |
| Library: Remove item                 | library item (+ ID override)                             |       |
| Playlist: Select active playlist     | playlist (+ ID override)                                 |       |

### Playlist and item properties

| Action                               | Options                                   | Notes                                             |
| ------------------------------------ | ----------------------------------------- | ------------------------------------------------- |
| Playlist: Set global loop            | playlist, on / off                        |                                                   |
| Playlist: Set autoplay               | playlist, on / off                        |                                                   |
| Playlist: Set end-of-playlist action | playlist, action, target playlist / media | Stop, Loop playlist, Jump to playlist, Play media |
| Playlist item: Set disabled          | item, on / off                            | Skips the item without editing the playlist       |
| Playlist item: Set auto next         | item, on / off                            |                                                   |
| Playlist item: Set playback rate     | item, rate                                |                                                   |
| Playlist item: Set offset            | item, offset (ms)                         |                                                   |
| Playlist item: Set color             | item, colour                              |                                                   |
| Playlist item: Set transition type   | item, Fade / Cut                          |                                                   |

### Outputs and services

| Action                                        | Options                                         | Notes                                       |
| --------------------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| ▸ Output: Black / Clock / Logo / Test pattern | —                                               | The Program output modes                    |
| ▸ NDI: Initialize                             | source name, width, height, frame rate          |                                             |
| ▸ NDI: Start / Stop                           | —                                               |                                             |
| ▸ OMT: Initialize                             | source name, width, height, frame rate, quality | Quality: Default / High / Medium / Low      |
| ▸ OMT: Start / Stop                           | —                                               |                                             |
| Player: Select controlled Player              | Player 1 / Player 2                             | Switches which Player QPlayer itself drives |

## Feedbacks

33 feedbacks — 32 boolean and one advanced. Those that address a playback channel carry the same **Target
Player** dropdown as the actions, so the colour on a readout button and the number printed on it can name the
same Player.

| Feedback                                   | Type     | Description                                           |
| ------------------------------------------ | -------- | ----------------------------------------------------- |
| Connection is ok                           | boolean  | The module is reaching QPlayer                        |
| Active window is playing                   | boolean  |                                                       |
| Active window matches                      | boolean  | Preview / Program                                     |
| Preview is playing                         | boolean  |                                                       |
| Program is playing                         | boolean  |                                                       |
| Repeat is enabled                          | boolean  |                                                       |
| Repeat mode matches                        | boolean  | Loop / Loop Fade / Loop Ping-Pong                     |
| Playback direction matches                 | boolean  | Forward or reverse — the reverse leg of a Ping-Pong   |
| Controlled Player matches                  | boolean  | Which Player QPlayer is driving                       |
| Shuffle is enabled                         | boolean  |                                                       |
| Dual Player: transports are ganged         | boolean  |                                                       |
| Dual Player: transitions are ganged        | boolean  |                                                       |
| Transition is active                       | boolean  | Lights while a Take / Fade is running                 |
| Program mode matches                       | boolean  | Media only / Black / Clock / Logo / Test pattern      |
| Window has media loaded                    | boolean  |                                                       |
| Window media type matches                  | boolean  | Video / Image / Audio / Blank / no media              |
| Window media name matches                  | boolean  | Exact match, contains, starts with, ends with         |
| Window media path matches                  | boolean  | Same match modes                                      |
| Active playlist name matches               | boolean  | Same match modes                                      |
| Marks are set                              | boolean  | Mark IN, Mark OUT, or both                            |
| Window remaining time comparison           | boolean  | `<`, `<=`, `=`, `>=`, `>` against a number of seconds |
| Window progress percent comparison         | boolean  | Same operators, against a percentage                  |
| **Window remaining time dynamic style**    | advanced | Paints a countdown amber then red — see below         |
| Audio meter comparison                     | boolean  | Left / Right / Left peak / Right peak, per window     |
| Program offset countdown is active         | boolean  | The item's start offset is still running down         |
| NDI is enabled                             | boolean  |                                                       |
| NDI is running                             | boolean  |                                                       |
| OMT is available                           | boolean  |                                                       |
| OMT is running                             | boolean  |                                                       |
| Audio bus is muted                         | boolean  | Main Mix or Monitoring, per Player                    |
| Extended (fullscreen) output can be driven | boolean  | A second display is present and usable                |
| Extended (fullscreen) output is open       | boolean  |                                                       |
| Monitor output target available            | boolean  |                                                       |

### Remaining time colours

`Window remaining time dynamic style` paints a countdown amber then red. Its **Thresholds** option starts on
_Follow QPlayer settings_: the amber and red points are the ones set in the application's Settings panel, in
seconds or in percent of the item, and changing them there changes the buttons at once. Choose _Custom
values_ to type numbers that belong to that button alone.

## Variables

318 variables, all prefixed with `$(videopathe-qplayer:…)`, in three sets.

**Connection-wide** (17, published once) — `connection_status`, `websocket_connected`, `server_url`,
`last_updated`, `network_primary_ip`, `network_hostname`, `network_port`, `player_id`, `player_name`,
`dual_player_enabled`, `monitor_available`, `monitor_display_id`, `monitor_display_name`,
`monitor_display_resolution`, and QPlayer's own readout thresholds `remaining_warn_threshold`,
`remaining_alert_threshold`, `remaining_threshold_mode` (which names their unit).

**Per-Player** (97, published three times) — the bare names describe the Player this connection watches; the
same names under `p1_` and `p2_` describe each Player by name, so one connection can drive a readout for
either:

    $(videopathe-qplayer:p2_program_remaining_formatted)

- **Transport** — `active_window`, `active_is_playing`, `preview_playing`, `program_playing`,
  `repeat_enabled`, `repeat_mode`, `playback_direction`, `loop_count`, `loop_limit`, `shuffle_enabled`
- **Transitions & output** — `transition_type`, `transition_duration_ms`, `transition_active`,
  `program_mode`, `program_mode_label` (the upper-case caption meant for a button; `program_mode` stays the
  raw API word)
- **Time** — `current_time_*`, `duration_*`, `remaining_*` and `elapsed_*` (each in `_seconds` and
  `_formatted`), `progress_percent`, `mark_in_seconds`, `mark_out_seconds`, `cue_duration_seconds`,
  `cue_remaining_seconds`, `program_offset_countdown_seconds`, plus the `preview_*` and `program_*` variants
- **Media** — `active_media_*`, `preview_media_*`, `program_media_*` and `selected_media_*` (name, path,
  type, duration, playback rate)
- **Playlists** — `playlist_count`, `active_playlist_id` / `_name` / `_index` / `_item_count`,
  `preview_playlist_*`, `program_playlist_*`, `preview_item_index`, `program_item_index`
- **Audio** — `master_volume_percent`, `preview_volume_percent`, `program_volume_percent`, the eight
  `audio_{preview,program}_{left,right}[_peak]` meters, `main_output_muted`, `monitoring_muted`
- **Services** — `ndi_enabled`, `ndi_running`, `ndi_source_name`, `ndi_resolution`, `ndi_frame_rate`,
  `ndi_alpha_mode`, `omt_available`, `omt_enabled`, `omt_running`, `omt_source_name`, `omt_resolution`,
  `omt_frame_rate`, `omt_quality`
- **Extended output** — `extended_display_available`, `extended_display_open`, `extended_display_reason`

**Player names** — `p1_player_name` and `p2_player_name` carry the name each Player has in the application,
so a button can be labelled with what the operator called that channel rather than with its slot number.
Renaming a Player in QPlayer repaints the button.

## Presets

48 ready-made buttons in eight categories. Every preset also carries a "connection lost" feedback that turns
the button dark red when QPlayer is unreachable. Presets drop in on `Active Player` — to build a page
dedicated to one Player, set the button's **Target Player** after dropping it.

- **Transport** — Play, Pause, Stop, Take, Cut, Fade, Fade to Alpha, Next, Previous, Eject, ±10 s jog, three
  GOTO buttons (1′, 30″ and 10″ before the OUT mark), Loop, Loop Fade, Loop Ping-Pong, Shuffle
- **Dual Player** — transport sync and transition sync toggles, lit from QPlayer's own state
- **Windows** — select Preview or Program as the active window
- **Players** — select Player 1 / Player 2 as the Player QPlayer drives
- **Outputs** — Black, Clock, Logo, Test pattern
- **Services** — fullscreen output toggle, NDI start/stop, OMT start/stop, open monitor window
- **Audio** — six mute buttons: the Main Mix and Monitoring of the active Player, and each bus pinned to
  Player 1 and to Player 2. They light red while that bus is muted
- **Readouts** — active remaining time and elapsed time, active media name, active playlist name, Preview
  remaining, Program remaining, Program mode

## Remote access and the API PIN

QPlayer's API listens on the network, and it is **open by default** — which is what a show network wants.
Nothing needs to be configured to drive QPlayer from a Companion on another machine: fill in its IP address
and leave **API PIN** blank.

QPlayer's own **Settings › Security** tab can put a 4-8 digit PIN in front of the API. Requests coming from
QPlayer's own machine are never asked for it, so a local `127.0.0.1` connection stays blank either way. For a
connection from another machine, type the same PIN into the module's **API PIN** field: it is sent as an
`X-QPlayer-Pin` header on HTTP requests and as a `pin` query parameter on the WebSocket. Without it, a remote
request is answered `401 unauthorized`.

QPlayer's API documentation panel lists the addresses the machine is reachable on, one per detected network.

## Development

```sh
corepack enable
yarn install
yarn build      # compiles TypeScript to dist/
yarn dev        # watch mode — recommended while testing with Companion
yarn lint       # eslint + prettier
yarn format     # applies prettier
yarn package    # builds a .tgz for Companion
```

To test in Companion developer mode, set Companion's **Developer modules path** to the _parent_ folder
containing `companion-module-videopathe-qplayer` — not to the module folder itself — then add a **Videopathe:
QPlayer** connection. In watch mode, Companion reloads the module when the files are rebuilt.

## API reference

- `ws://<host>:2224/` — live state stream (transport, playhead, audio meters)
- `GET /api/status` — aggregated state snapshot for both Players
- `GET /api/network-info`, `/api/monitor-window-target`, `/api/library/items`
- `GET /api/ndi/status?player=…`, `GET /api/omt/status?player=…`
- `POST /api/player/*` — transport, seek, marks, loops, transitions, volume, mute, shuffle, window selection,
  media loading, the Dual Player gangs
- `POST /api/output/{black,clock,logo,pattern}`
- `POST /api/playlist/select`, `/api/playlist/patch`, `/api/playlist/item/patch`,
  `/api/playlist/load-to-{preview,program}`
- `POST /api/library/{play,load,remove}`
- `POST /api/ndi/{initialize,start,stop}`, `POST /api/omt/{initialize,start,stop}`
- `POST /api/monitor-window-target/{open,close}`

Player-scoped requests carry a `player` field; omitting it addresses the Player QPlayer is currently driving.
QPlayer exposes an interactive API documentation at `http://127.0.0.1:2224/api/docs`.

## Troubleshooting

- **Connection failure on the same machine** — check that QPlayer is running and that the port matches
  (`2224` by default).
- **`401 unauthorized` from another computer** — QPlayer has a PIN enabled in Settings > Security and the
  **API PIN** in the module configuration is missing or does not match. See
  [Remote access and the API PIN](#remote-access-and-the-api-pin).
- **Variables update but the playhead is jumpy** — the WebSocket is not connected and the module is falling
  back to polling. Check `websocket_connected`, and lower the poll interval if the socket cannot be used.
- **A playlist or library item is missing from a dropdown** — the lists come from QPlayer and refresh on the
  poll tick. Use the ID or path override field beside the dropdown to name a target directly.
- **Buttons drive the wrong Player** — a connection pinned to Player 1 or Player 2 in its configuration
  overrides `Active Player` on every button it carries.

## License

MIT
