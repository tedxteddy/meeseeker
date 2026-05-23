## Project: Meeseeker (job board)

### Sessions
- Branch: `session-may2026-ux-automation` -> master on meeseeker
- Repo: https://github.com/tedxteddy/meeseeker
- To restore: `git pull && git checkout session-may2026-ux-automation && npm i && npm start`

### Current TODO (high)
- Debug for bugs and errors
- Auto job search from resume (paste → auto-analyze → auto-find jobs)
- Floating "Add Resume" button (bottom-right, bobbing animation)
- Mobile-friendly responsive UI (bottom nav, different mobile layout)
- QR code to open app on mobile (local network IP)
- Free hosting setup (Render/Railway)

### TODO (medium)
- Add more job APIs: Remote100K, HiringCafe, Wellfound, Contra, NoDesk, LinkedIn, Arc
- View uploaded resume in-app
- Modern design refresh from reference site

### Completed (this session)
- Adzuna, Jooble, Jobicy, Claude, Gemini added as API providers in Settings with (needs key)/(free) badges
- Fixed YC Jobs search (dead endpoint → live api.ycombinator.com/v0.1/companies)
- Fixed Apify search (removed actor → santamaria-automations/indeed-scraper)
- Direct Apply button on search results (opens URL + auto-saves job)
- Email extraction from job descriptions + mailto: apply
- Free email scraper endpoint (POST /api/scrape/emails) — fetches URL, extracts emails
- LinkedIn URL detection → blue "Apply on LinkedIn" button
- "Find Emails" button in job detail panel (scrapes job URL for contact emails)
- Full bug sweep: 31 bugs fixed across JobsView, Settings, ResumeView, Dashboard, server.js, api.ts, store.ts, notion.ts, ResumeImprovementView, NetworkView. Key fixes: null checks on required_skills, protected all response.json() calls, localStorage safety wrappers, division-by-zero guard, URL.revokeObjectURL timing fix

### Previously Completed
- ResumeView: progress steps, URL extraction, portfolio score, better loading
- Work arrangement toggle (Remote/Hybrid/Office)
- Onboarding wizard (5-step)
- Notion integration (toggle in Settings, CORS proxy via Express)
- ATS export, skill gap, keyword optimization
- Vite proxy for clean dev
- Fixed: onboarding resume check, HTML entities in JSX, Notion CORS, Dashboard fragment
