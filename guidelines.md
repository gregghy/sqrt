# Life Manager App - Project Guidelines

## 1. Architecture & Security
* **Hosting:** Self-hosted on a NixOS server.
* **Networking:** Accessed exclusively via Tailscale (Mesh VPN).
* **Security Assessment:** Yes, this setup is completely private and secure. By binding your web server (e.g., Nginx or Caddy) strictly to your Tailscale IP address (usually starting with `100.x.x.x`), the application is totally invisible to the public internet. Only devices authenticated on your specific Tailscale network can access the address.

## 2. Core Pages & Features

### Home
* **Purpose:** The default entry point and dashboard.
* **Components:**
    * High-level statistics and daily summaries.
    * Long-term goal progression trackers.
    * Short-term, actionable to-do lists.

### Notebook
* **Purpose:** Web-based knowledge base mimicking Obsidian.
* **Components:**
    * Markdown-capable editor accessible directly in the browser.
    * Server-hosted vault, ensuring all files are stored centrally on the NixOS machine but remain accessible/modifiable from any Tailscale-connected device.

### Calendar / Habit Tracker
* **Purpose:** Routine management and habit reinforcement.
* **Components:**
    * Habit tracking matrix (daily/weekly checklists).
    * **Web Push Notifications:** Browser-based notifications sent to your phone (e.g., reminders for daily hygiene, tasks, or check-ins).

## 3. Design System & Color Palette
The app will feature a modern, warm dark-mode aesthetic.

* **Backgrounds:**
    * App Background: `#1E1A16` (Deep dark brown)
    * Surfaces/Cards: `#2C2621` (Charcoal brown)
    * Elevated Cards/Hover States: `#38312B` (Lighter charcoal brown)
* **Accents:**
    * Primary Accent: `#D4A373` (Warm tan/gold) - Used for primary buttons and active tabs.
    * Secondary Accent: `#E29578` (Muted terracotta) - Used for alerts, overdue habits, or secondary actions.
    * Tertiary Accent: `#FAEDCD` (Soft sand) - Used for subtle highlights or borders.
* **Typography:**
    * Primary Text: `#F9F6F0` (Cream) - Headings and main body text.
    * Secondary Text: `#B5A89E` (Ashy tan) - Subtitles, metadata, and placeholder text.