## Project: Meeseeker (job board)

### Sessions
- Branch: `session-may2026-ux-automation` -> master on meeseeker
- Repo: https://github.com/tedxteddy/meeseeker
- To restore: `gh repo clone tedxteddy/meeseeker && cd meeseeker && npm i && npm start`

### Current TODO
- Fix YC Jobs search (endpoint may be outdated)
- Auto job search from resume (paste → auto-analyze → auto-find jobs)
- Floating "Add Resume" button (bottom-right, bobbing animation)
- View uploaded resume in-app
- Modern design refresh (user has reference site)
- Better APIs (Adzuna, Claude/Groq/Gemini)

### Completed
- ResumeView: progress steps, URL extraction, portfolio score, better loading
- Work arrangement toggle (Remote/Hybrid/Office)
- Onboarding wizard (5-step)
- Notion integration (toggle in Settings, CORS proxy via Express)
- ATS export, skill gap, keyword optimization
- Vite proxy for clean dev
- Fixed: onboarding resume check, HTML entities in JSX, Notion CORS, Dashboard fragment
