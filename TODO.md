# Meeseeker — Todo

## Bugs
- [x] Onboarding falsely shows "Resume detected" when no resume exists
- [x] HTML entities not rendering in JSX (→ and ←)
- [x] Notion API blocked by CORS (proxied through Express now)
- [x] Dashboard missing `</>` fragment close
- [ ] YC Jobs search button errors (needs investigation)

## Features
- [x] ResumeView enhancements (progress steps, URL extraction, portfolio score)
- [x] Work arrangement toggle (Remote/Hybrid/Office)
- [x] 5-step onboarding wizard
- [x] Notion integration (Settings toggle, CORS proxy)
- [x] ATS-friendly resume export
- [x] Skill gap analysis with learning resources
- [x] Keyword/buzzword optimization

## Next (discussed)
- [ ] **Auto job search from resume** — paste resume → auto-analyze → auto-search jobs from extracted skills
- [ ] **Floating "Add Resume" button** — bottom-right, bobbing animation, state changes to "Resume Uploaded"
- [ ] **View uploaded resume in-app** — modal/mini-panel showing raw text/analysis
- [ ] **Modern design refresh** — use reference website for color/layout inspiration
- [ ] **Better APIs** — Adzuna (jobs), Claude/Groq/Gemini (AI parsing)
- [ ] **Fluid workflow** — fewer clicks, resume + matched jobs on same page

## Sessions
- `session-may2026-ux-automation` — all work so far (pushed to meeseeker/master)
- To restore: `git clone https://github.com/tedxteddy/meeseeker.git && cd meeseeker && npm install && npm start`

## Setup
```bash
git clone https://github.com/tedxteddy/meeseeker.git
cd meeseeker
npm install
npm start
# Frontend: localhost:3000  |  API: localhost:3001
```
