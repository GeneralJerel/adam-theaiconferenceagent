## AI Conference Agent

Companion app for the AI Conference. It lets attendees ask questions about talks they missed by searching processed video transcripts. The project includes:

- Data collection scripts (YouTube channel/playlist scraping, transcript extraction)
- A React UI (Vite + TypeScript) that mirrors a modern hero layout and a simple chat interface

### Repository structure

```
ai-conference-agent/
  ai-conference-agent-ui/     # React app (Vite, TypeScript, atomic components)
  tools/                      # Data collection / scraping utilities
  transcripts/                # Saved transcripts (.txt) generated from YouTube
  channel_videos.json         # Export of channel videos (URLs + metadata)
  channel_videos.csv          # Same as CSV
```

### Prerequisites

- Node.js 18+ recommended (tested with Node 22)
- For scraping:
  - Puppeteer (bundled via tools) uses a Chromium build
  - Playwright (installed by script) downloads browsers on first run

### 1) Collect video URLs from a YouTube channel or playlist

Script: `tools/extractAllURLs.js`

Supported inputs:
- Channel Videos page (recommended): `https://www.youtube.com/@<channel>/videos`
- Playlist URL: `https://www.youtube.com/playlist?list=<LIST_ID>`

Run examples:

```bash
# Channel videos page → outputs channel_videos.csv and channel_videos.json
YT_URL="https://www.youtube.com/@aiconference/videos" DAYS=0 node tools/extractAllURLs.js

# Playlist
YT_URL="https://www.youtube.com/playlist?list=YOUR_LIST_ID" DAYS=0 node tools/extractAllURLs.js
```

Notes:
- `DAYS=0` means no time filter. Set to a number to include only recent uploads.
- Avoid piping the output to head/less; large console logs can trigger EPIPE on some shells.

### 2) Extract transcripts for each video

Script: `tools/getYoutubeTranscript.js`

Batch mode (reads `channel_videos.json` and saves `.txt` files under `transcripts/`):

```bash
node tools/getYoutubeTranscript.js \
  --from-json=channel_videos.json \
  --out=transcripts \
  --timeout=60000
```

Options:
- `--no-timestamps`: save plain text (no timecodes)
- `--headful`: run a visible browser for debugging
- `--limit=N`: process only the first N entries for quick tests

File naming:
- Filenames are `NNN-<slugified-watch-title>-<videoId>.txt` (e.g., `001-bridging-the-data-chasm-...-Z7QWT75raF8.txt`).
- Titles are taken from the YouTube watch page (not the grid), so they match actual video titles.

Single-video mode:

```bash
node tools/getYoutubeTranscript.js "https://www.youtube.com/watch?v=<VIDEO_ID>" > transcript.txt
```

### 3) Run the React UI

Project: `ai-conference-agent-ui/` (Vite + React + TypeScript, atomic components)

Install and start:

```bash
cd ai-conference-agent-ui
npm install
npm run dev -- --host
```

Build:

```bash
npm run build
```

UI highlights:
- Hero section with prompt card (Enter or “Generate answers” navigates to chat)
- Chat view with markdown-rendered assistant messages, sender labels, and auto-scroll

### Troubleshooting

- EPIPE on terminal output: avoid piping node script output to `head`/`less`.
- No transcripts for some videos: not all videos expose transcripts; the script logs a warning and continues.
- Consent dialogs/region issues: Playwright attempts to dismiss common consent banners; re-run with `--headful` to observe.

### Development notes

- UI follows an atomic structure: atoms, molecules, organisms.
- Do not push to GitHub unless explicitly requested.


