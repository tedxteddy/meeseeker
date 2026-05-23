## Project: Meeseeker (job board)

### Sessions
- Branch: `session-may2026-ux-automation` -> master on meeseeker
- Repo: https://github.com/tedxteddy/meeseeker
- To restore: `git pull && git checkout session-may2026-ux-automation && npm i && npm start`

### Current TODO (estimate: ~4h total)
1. **Fix Apify search** — broken endpoint, slow response (~30min)
2. **Fix YC search** — slow/timing out (~20min)
3. **Fix "Find Jobs" from resume** — paste doesn't trigger search (~30min)
4. **Add date filters to job search** — posted within (24h, 3d, 7d, 30d) (~30min)
5. **Improve API provider integration** — better error handling, fallbacks, retry logic (~1h)
6. **Notion integration guide** — add tips/docs in-app on using Notion DB with job hunting (~30min)
7. **Bug sweep** — test all features, fix edge cases (~1h)

### Completed (this session — May 2026)
- Modern design refresh (#7): bold/minimal/square buttons nivisgear-inspired, all border-radius→0, heavier typography
- View uploaded resume in-app (#6): Preview button opens original PDF in new tab
- Free hosting setup (#4): render.yaml, start:prod script, Express serves built frontend in production
- Mobile-friendly responsive UI (#8): bottom nav with 6 tabs, active indicator bar, tab label in mobile header, compact cards, fadeSlideIn transitions
- Floating "Add Resume" button (bottom-right, bobbing animation)
- QR code to open app on mobile (local network IP)
- Auto job search from resume (paste → auto-analyze → auto-find jobs)

### Previously Completed
- Adzuna, Jooble, Jobicy, Claude, Gemini added as API providers in Settings with (needs key)/(free) badges
- Fixed YC Jobs search (dead endpoint → live api.ycombinator.com/v0.1/companies)
- Fixed Apify search (removed actor → santamaria-automations/indeed-scraper)
- Direct Apply button on search results (opens URL + auto-saves job)
- Email extraction from job descriptions + mailto: apply + free email scraper endpoint
- LinkedIn URL detection → blue "Apply on LinkedIn" + "Find Emails" button
- Full bug sweep: 31 bugs fixed (null checks, response.json() safety, localStorage wrappers, division-by-zero guard, URL.revokeObjectURL timing)
- ResumeView: progress steps, URL extraction, portfolio score, better loading
- Work arrangement toggle (Remote/Hybrid/Office), Onboarding wizard (5-step)
- Notion integration (toggle, CORS proxy), ATS export, skill gap, keyword optimization
- Vite proxy, Logo rebrand, AGENTS.md

### Notes
- Remote100K, HiringCafe, Wellfound, Contra, NoDesk, LinkedIn, Arc are UI/UX design inspiration only (not API integrations)
- Express v5 uses path-to-regexp v8 (`{*splat}` not `*`)
- `.env` is gitignored — keys go in Settings UI or `.env` for server-side
