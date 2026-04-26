# √ Life Manager

A modular, self-hosted personal dashboard for task management, note-taking, and habit tracking. Built to run 24/7 on a home server with minimal resource usage (~30-50 MB RAM).

![screenshot](https://img.shields.io/badge/status-alpha-orange) ![license](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Dashboard** — Tasks with goal assignment, stats overview
- **Notebook** — Markdown editor with folder organization and split edit/preview (Obsidian-compatible `.md` files)
- **Habit Tracker** — Daily checklist with streaks, week/month/year/all-time heatmap views
- **Responsive** — Desktop sidebar + mobile bottom nav
- **Private** — Designed for Tailscale mesh VPN access

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | [SvelteKit](https://kit.svelte.dev) |
| Database | [SQLite](https://sqlite.org) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| Styling | Vanilla CSS with custom properties |
| Runtime | Node.js (`adapter-node`) |

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run production server
PORT=3000 HOST=0.0.0.0 ORIGIN=http://your-tailscale-ip:3000 node build/index.js
```

## Configuration

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `ORIGIN` | `http://localhost:3000` | Public URL (required for CSRF) |

## Data Storage

- **Database**: `data/sqrt.db` (SQLite, auto-created)
- **Notes**: `vault/` directory (flat `.md` files, Obsidian-compatible)

Both directories are auto-created on first run. Back them up to preserve your data.

## Adding a New Page

1. Create `src/routes/my-page/+page.svelte`
2. Optionally add `+page.server.js` for server-side data
3. Add a nav entry in `src/routes/+layout.svelte` → `navItems`

## Project Structure

```
sqrt/
├── src/
│   ├── app.html                    # HTML shell
│   ├── lib/
│   │   ├── server/db.js            # SQLite database layer
│   │   └── styles/global.css       # Design system
│   └── routes/
│       ├── +layout.svelte          # App shell (collapsible sidebar)
│       ├── +page.svelte            # Home dashboard
│       ├── notebook/               # Markdown notebook
│       └── habits/                 # Habit tracker
├── static/favicon.svg              # √ favicon
├── data/                           # SQLite DB (gitignored)
├── vault/                          # Note files (gitignored)
└── package.json
```

## License

[MIT](LICENSE)
