## QPlayer

This module controls QPlayer through the HTTP and WebSocket API exposed by the desktop application.

### Connection

- Default host: blank; enter `127.0.0.1` for local QPlayer or the remote computer IP/hostname
- No requests are sent until a host is configured
- Default port: `2224`
- Player target: active Player, Player 1, or Player 2
- API PIN: leave blank unless QPlayer has a PIN set
- Polling complements the live WebSocket state stream

The module checks `/api/status` before asking any secondary endpoint. If
QPlayer is unavailable it backs off progressively up to 60 seconds and reports
the outage once, rather than filling Companion's log. A successful response
restores the configured polling interval and the WebSocket automatically.

### Remote access and the API PIN

QPlayer's API listens on the network and is **open by default**. To drive it
from another machine, enter that machine's IP address and leave **API PIN**
blank. QPlayer's API documentation panel lists the addresses it is reachable on,
one per detected network.

QPlayer's **Settings › Security** tab can put a 4-8 digit PIN in front of the
API. Requests coming from QPlayer's own machine are never asked for it, so a
local `127.0.0.1` connection stays blank either way. For a connection from
another machine, type the same PIN into **API PIN** — it authenticates both the
HTTP requests and the WebSocket. Without it a remote request is answered
`401 unauthorized`.

### Targeting a Player

Every action that addresses a playback channel — transport, marks, loops, output
modes, NDI, OMT, the extended display, media loading — carries a **Target Player**
dropdown with `Active Player`, `Player 1` and `Player 2`.

`Active Player` is the default and behaves exactly as the HTTP API does for a
request that names no Player: the command follows whichever Player QPlayer is
currently driving. Choosing `Player 1` or `Player 2` pins that one button, so a
single connection can carry dedicated controls for both Players side by side.

The connection's own Player setting still decides which Player this connection
_watches_: its variables, feedbacks and NDI/OMT status polling. Pinning the
connection also pins what `Active Player` resolves to for its buttons.

Feedbacks carry the same dropdown, so the colour on a readout button and the
number printed on it can name the same Player.

Actions that belong to the application rather than to one channel — playlist
selection and item properties, library removal, the monitoring window — have no
Target Player dropdown.

### Dual Player: the two gangs

`Sync transports` and `Sync transitions` describe the relationship _between_ the
two Players, so neither takes a Target Player.

- **Sync transports** — Play, Pause, Stop, Seek, Speed, Eject, Loop and
  Next / Previous act on both Players. Each one navigates its **own** playlist.
- **Sync transitions** — TAKE, CUT, FADE, Fade to Alpha and the output modes
  fire at the same instant on both, each Player taking its **own** PVW. Both
  engines are primed before either starts, which is what makes the two
  simultaneous rather than merely close. Needs the 2 Players view in QPlayer.

Both default to **Toggle**; **On** and **Off** are there for macros, which
cannot know which way a toggle will land. Their presets light from QPlayer's own
state, so a gang switched from the application's toolbar is reflected on the
button.

### Controls

- Play, Pause, Stop, seek, relative seek and goto remaining time
- Preview/Program selection, Take, Cut, Fade and Fade to Alpha
- Mark In, Mark Out, clear marks and goto marks
- Loop, Loop Fade and Loop Ping-Pong
- Per-item playlist loops, including Ping-Pong round-trip counts
- Per-item comments (an empty value clears the comment)
- Playlist selection and media loading from playlists or the library
- Jog (rewind/forward by any number of seconds, 10 by default) and GOTO a point
  measured back from the OUT mark
- Mute, per Player, on the Main Mix or on Monitoring — the two buses the
  application's audio panel names
- Black, Clock, Logo and Test Pattern modes
- Per-Player NDI and OMT control
- Fullscreen (extended) output per Player
- Monitoring window: open, close or toggle

### MASTER / BACKUP / SLAVE link

The `Link` actions can name a QPlayer instance, test a peer, push the complete
project to an assigned BACKUP or SLAVE, send selected media files, and promote
a connected BACKUP to MASTER.

`Push project` sends playlists and settings, with an option to include every
local file referenced by them. The destination is resolved on the receiving
computer, so the same action works between macOS and Windows:

- `Desktop / QPlayer Transfers/<project name>`
- `Documents / QPlayer / Transfers/<project name>`

Enter the target QPlayer IP or `host:port`, plus its API PIN when enabled. The
receiving QPlayer must already be assigned to this MASTER. `BACKUP take control`
uses the live authenticated link: the current BACKUP becomes MASTER and the
former MASTER reconnects as its BACKUP.

`Send media files` uses the 24-character media IDs returned by QPlayer's local
`GET /api/link/media/catalog` endpoint. Separate several IDs with commas or
spaces. QPlayer deliberately accepts this operation only from the same machine,
so the Companion connection must point to a local QPlayer for this action.

The module also publishes the current Link role, instance identity and assigned
MASTER as variables. `QPlayer Link role matches` can light a MASTER, BACKUP or
SLAVE status button.

### QMonitor / WebRTC streams

`QMonitor / WebRTC: Configure a stream` enables or disables one P1/P2 Preview
or Program feed and sets its locked resolution, frame rate and bitrate. The
action first reads the existing stream configuration and changes only the
selected feed, so the other three feeds keep their settings.

### Live state

Variables come in three sets. The bare names — `remaining_formatted`,
`active_media_name` and the rest — describe the Player this connection watches.
The same names under `p1_` and `p2_` describe each Player by name, so one
connection can drive a readout for either:

    $(videopathe-qplayer:p2_program_remaining_formatted)

Per-Player values include:

- current media, playlist, time, duration and remaining time, per surface
  (`preview_*` and `program_*`) as well as for the active window
- Preview and Program transport state
- Loop mode, playback direction and completed loop count
- marks, transition and output mode (`program_mode_label` is the upper-case
  caption meant for a button; `program_mode` stays the raw API word)
- volume and audio meters
- NDI/OMT status, and whether the fullscreen output can be driven and is open

Each Player also publishes the name it carries in the application
(`p1_player_name`, `p2_player_name`), so a button can be labelled with what the
operator called that channel rather than with its slot number. Renaming a
Player in QPlayer repaints the button.

Connection-wide values — connection status, network details, the monitoring
window target, the controlled Player and QPlayer's own remaining-time
thresholds (`remaining_warn_threshold`, `remaining_alert_threshold` and
`remaining_threshold_mode`, which names their unit) — are published once,
unprefixed.

### Remaining time colours

`Window remaining time dynamic style` paints a countdown amber then red. Its
**Thresholds** option starts on _Follow QPlayer settings_: the amber and red
points are the ones set in the application's Settings panel, in seconds or in
percent of the item, and changing them there changes the buttons at once.
Choose _Custom values_ to type numbers that belong to that button alone.

### Ping-Pong

The `Player: Set loop` action contains a single loop control with three modes: `Loop`, `Loop Fade`, and `Loop Ping-Pong`. The Ping-Pong feedback becomes active only when repeat is enabled with the `ping-pong` mode.

For playlist media, use `Playlist item: Set loop mode`. In Ping-Pong mode, a completed loop means one complete forward/reverse round trip.

### Presets

The module includes presets for Player selection, transport, all loop modes, outputs, services, audio and time/media readouts, organised in `Transport`, `Dual Player`, `Windows`, `Players`, `Outputs`, `Services`, `Audio` and `Readouts`. Each button appears in exactly one category.

`Audio` holds six mute buttons: the Main Mix and Monitoring of the active
Player, and each bus pinned to Player 1 and to Player 2. They light red while
that bus is muted.

Presets drop in on `Active Player`. To build a page dedicated to one Player, set the button's **Target Player** after dropping it.
