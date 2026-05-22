# Meeseeker — Career Intelligence Dashboard

A local-first job search dashboard with real-time job scraping, AI resume parsing, Notion sync, and application tracking. Deploy once, share with everyone — each user brings their own API keys.

## Quick Start

```bash
git clone https://github.com/tedxteddy/meeseeker.git
cd meeseeker
npm install
npm start
```

Opens at `http://localhost:3000` with API server on `http://localhost:3001`.

## How It Works

- **Everything stays in YOUR browser** — localStorage stores jobs, resumes, applications, and API keys
- **No sign-up, no accounts, no cloud database** — each `npm start` gives you a clean local instance
- **API keys are yours** — add them in Settings, they never leave your machine (except to the API provider)
- **Data persists** between sessions in your browser's localStorage
- **Notion sync** — optional cloud backup to your own Notion database

## Setup (2 minutes)

1. Click **Settings** (gear icon in header)
2. Paste your API keys — they stay in your browser, never shared
3. Optionally enable **Notion sync** for cloud backup
4. Start searching

### API Keys (all optional)

| Provider | What it does | Free tier | Get key |
|---|---|---|---|
| **JSearch** (RapidAPI) | Search 100+ job boards | 500 searches/month | [rapidapi.com](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) |
| **Apify** | Scrape Indeed directly | $5 free credits | [console.apify.com](https://console.apify.com/account#/integrations) |
| **OpenAI** | AI resume parsing | Pay-per-use (~$0.01/resume) | [platform.openai.com](https://platform.openai.com/api-keys) |

**Meeseeker works without any keys** — it's free and built-in (YC Jobs source needs no key).

### Notion Setup (optional)

1. Create a Notion database with the properties listed in Settings → Notion
2. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
3. Share your database with the integration
4. Enable Notion in Settings → Notion and paste your API key + Database ID

## Features

- **3 job sources**: JSearch (100+ boards), Apify (Indeed), YC Jobs (startups)
- **Work arrangement filter**: Remote / Hybrid / Office toggle
- **PDF/TXT resume upload** with ATS scoring and skill extraction
- **AI resume parsing** via OpenAI (or local fallback)
- **Skill gap analysis** with learning resources
- **Keyword/buzzword optimization** for ATS
- **Application pipeline** with Kanban board
- **Networking tracker** with outreach templates
- **90-day growth roadmap** with portfolio project ideas
- **Notion sync** — push jobs to your own Notion database
- **Onboarding wizard** for new users
- **All data stored locally** in your browser
- **API keys in Settings** — each visitor uses their own keys, yours are never exposed

## For Deployment

When you deploy Meeseeker to GitHub Pages, Netlify, Vercel, or any host:
- Each user configures their own API keys in Settings
- Keys are stored in `localStorage` — never sent to any server except the API providers
- The server proxies requests but doesn't store keys
- Notion sync works per-user with their own Notion database

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js (local proxy for API calls)
- **Job APIs**: JSearch, Apify, YC Jobs
- **Resume**: PDF.js (client-side), OpenAI GPT-4o-mini (optional)
- **Cloud Sync**: Notion API (optional)
- **Storage**: localStorage (zero backend database)