import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const isProd = process.env.NODE_ENV === 'production'

if (isProd && process.env.VERCEL !== '1') {
  app.use(express.static('dist'))
  app.get('*', (_req, res) => res.sendFile('dist/index.html'))
}

// Proxy for Notion API (bypasses browser CORS)
app.all('/api/notion/{*splat}', (req, res) => {
  const notionUrl = `https://api.notion.com/v1/${req.params.splat}`

  fetch(notionUrl, {
    method: req.method,
    headers: {
      'Authorization': `Bearer ${req.headers['x-notion-token'] || ''}`,
      'Notion-Version': req.headers['x-notion-version'] || '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
  })
    .then(async (response) => {
      try {
        const data = await response.json()
        res.status(response.status).json(data)
      } catch {
        res.status(500).json({ error: 'Failed to parse Notion response' })
      }
    })
    .catch((error) => {
      res.status(500).json({ error: error.message || 'Notion proxy error' })
    })
})

function getKeys(req) {
  return {
    jsearch: req.body.apiKeys?.jsearch || process.env.JSEARCH_API_KEY || '',
    apify: req.body.apiKeys?.apify || process.env.APIFY_API_TOKEN || '',
    openai: req.body.apiKeys?.openai || process.env.OPENAI_API_KEY || '',
    adzuna: req.body.apiKeys?.adzuna || process.env.ADZUNA_API_KEY || '',
    jooble: req.body.apiKeys?.jooble || process.env.JOOBLE_API_KEY || '',
    claude: req.body.apiKeys?.claude || process.env.CLAUDE_API_KEY || '',
    gemini: req.body.apiKeys?.gemini || process.env.GEMINI_API_KEY || '',
  }
}

app.post('/api/jobs/search', async (req, res) => {
  const { source, query, location, remote_only, job_type, date_posted } = req.body
  const keys = getKeys(req)

  if (!query) {
    return res.status(400).json({ error: 'query is required' })
  }

  if (source === 'apify') {
    return searchWithApify(req, res, keys)
  }

  if (source === 'yc') {
    return searchWithYC(req, res)
  }

  if (source === 'adzuna') {
    return searchWithAdzuna(req, res, keys)
  }

  if (source === 'jooble') {
    return searchWithJooble(req, res, keys)
  }

  if (source === 'jobicy') {
    return searchWithJobicy(req, res)
  }

  return searchWithJSearch(req, res, keys)
})

async function searchWithJSearch(req, res, keys) {
  if (!keys.jsearch) {
    return res.status(500).json({ error: 'JSearch API key not configured. Add it in Settings.' })
  }

  const { query, location, remote_only, job_type, date_posted } = req.body

  try {
    const params = new URLSearchParams({
      query,
      page: '1',
      num_pages: '1',
    })

    if (location) params.set('location', location)
    if (remote_only) params.set('remote_jobs_only', 'true')
    if (job_type) params.set('employment_types', job_type)
    if (date_posted) params.set('date_posted', date_posted)

    const response = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
      headers: {
        'X-RapidAPI-Key': keys.jsearch,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    })

    if (!response.ok) {
      throw new Error(`JSearch API error: ${response.status}`)
    }

    const data = await response.json()
    const jobs = (data.data || []).map((job) => ({
      job_title: job.job_title,
      employer_name: job.employer_name,
      employer_logo: job.employer_logo,
      employer_website: job.employer_website,
      job_employment_type: job.job_employment_type,
      job_apply_link: job.job_apply_link,
      job_description: job.job_description || '',
      job_is_remote: job.job_is_remote,
      job_posted_at_timestamp: job.job_posted_at_timestamp,
      job_city: job.job_city,
      job_state: job.job_state,
      job_country: job.job_country,
      job_required_skills: job.job_required_skills,
      job_salary_currency: job.job_salary_currency,
      job_salary_period: job.job_salary_period,
      job_min_salary: job.job_min_salary,
      job_max_salary: job.job_max_salary,
      source: 'JSearch',
    }))

    res.json({ jobs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

async function searchWithApify(req, res, keys) {
  if (!keys.apify) {
    return res.status(500).json({ error: 'Apify API token not configured. Add it in Settings.' })
  }

  const { query, location, remote_only } = req.body

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  const actorIds = [
    'santamaria-automations~indeed-scraper',
    'curiouser~indeed-scraper',
    'misceres~indeed-scraper',
  ]

  for (const actorId of actorIds) {
    try {
      const input = { search: query, maxResults: 20 }
      if (location) input.location = location

      const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${keys.apify}&timeoutSecs=20`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      })

      if (!response.ok) {
        if (response.status === 404) continue
        const errBody = await response.text().catch(() => '')
        throw new Error(`Apify run failed: ${response.status} ${errBody.slice(0, 200)}`)
      }

      let items
      try { items = await response.json() }
      catch { throw new Error('Invalid JSON from Apify') }

      const jobs = (Array.isArray(items) ? items : []).map((item) => ({
        job_title: item.jobTitle || item.title || item.job_title || '',
        employer_name: item.company || item.employerName || item.company_name || item.employer_name || '',
        employer_logo: item.companyLogo || item.employerLogo || item.company_logo || null,
        employer_website: item.companyUrl || item.employerWebsite || '',
        job_employment_type: item.jobType || item.job_type || item.employmentType || item.job_employment_type || '',
        job_apply_link: item.url || item.applyLink || item.apply_url || item.job_apply_link || '',
        job_description: item.description || item.jobDescription || item.job_description || '',
        job_is_remote: remote_only || /remote/i.test(item.title || '') || /remote/i.test(item.description || '') || item.isRemote === true,
        job_posted_at_timestamp: item.datePosted || item.postedDate || item.date_posted ? new Date(item.datePosted || item.postedDate || item.date_posted).getTime() / 1000 : Date.now() / 1000,
        job_city: item.location ? item.location.split(',')[0]?.trim() : null,
        job_state: null,
        job_country: '',
        job_required_skills: item.skills || item.requiredSkills || item.required_skills || [],
        job_salary_currency: item.salaryCurrency || item.salary_currency || null,
        job_salary_period: item.salaryPeriod || item.salary_period || null,
        job_min_salary: item.salaryMin || item.salary_min || item.minSalary || null,
        job_max_salary: item.salaryMax || item.salary_max || item.maxSalary || null,
        source: 'Apify',
      }))

      clearTimeout(timeoutId)
      return res.json({ jobs })
    } catch (error) {
      if (error.name === 'AbortError') {
        clearTimeout(timeoutId)
        return res.status(500).json({ error: 'Apify search timed out after 12s. Try a more specific query or check your API key.' })
      }
      if (actorId === actorIds[actorIds.length - 1]) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return res.status(500).json({ error: `Apify search failed: ${message}` })
      }
    }
  }
}

async function searchWithYC(req, res) {
  const { query } = req.body

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch('https://api.ycombinator.com/v0.1/companies?limit=50&hiring=true', { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`YC API error: ${response.status}`)
    }

    let data
    try { data = await response.json() }
    catch { throw new Error('Invalid JSON from YC API') }
    const companies = data.companies || []

    const filtered = companies.filter((c) => {
      if (!query) return true
      const haystack = `${c.name || ''} ${c.oneLiner || ''} ${c.tags?.join(' ') || ''}`.toLowerCase()
      const terms = query.toLowerCase().split(/\s+/)
      return terms.some((term) => haystack.includes(term))
    })

    const jobs = filtered.map((c) => ({
      job_title: c.oneLiner || 'Open position at ' + (c.name || 'YC startup'),
      employer_name: c.name || 'YC Startup',
      employer_logo: c.smallLogoUrl || null,
      employer_website: c.website || c.url || '',
      job_employment_type: 'FULL_TIME',
      job_apply_link: `https://www.workatastartup.com/companies/${c.slug}`,
      job_description: c.longDescription || c.oneLiner || '',
      job_is_remote: c.tags?.some(t => /remote/i.test(t)) || false,
      job_posted_at_timestamp: Date.now() / 1000,
      job_city: c.locations?.[0]?.split(',')[0]?.trim() || null,
      job_state: null,
      job_country: c.regions?.includes('United States of America') ? 'US' : '',
      job_required_skills: c.tags || [],
      job_salary_currency: null,
      job_salary_period: null,
      job_min_salary: null,
      job_max_salary: null,
      source: 'YC',
    }))

    clearTimeout(timeoutId)
    res.json({ jobs })
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      return res.status(500).json({ error: 'YC search timed out after 8s. Try again later.' })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

async function searchWithAdzuna(req, res, keys) {
  if (!keys.adzuna) {
    return res.status(500).json({ error: 'Adzuna API key not configured. Use format app_id:app_key.' })
  }

  const { query, location, date_posted } = req.body
  const parts = keys.adzuna.split(':')
  const appId = parts[0] || ''
  const appKey = parts[1] || ''

  try {
    const params = new URLSearchParams({ app_id: appId, app_key: appKey, results_per_page: '20', what: query || '' })
    if (location) params.set('where', location)
    if (date_posted) {
      const daysMap = { today: '1', '3days': '3', week: '7', month: '30' }
      const maxDays = daysMap[date_posted]
      if (maxDays) params.set('max_days_old', maxDays)
    }

    const response = await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`)

    if (!response.ok) throw new Error(`Adzuna API error: ${response.status}`)

    const data = await response.json()
    const jobs = (data.results || []).map((job) => ({
      job_title: job.title || '',
      employer_name: job.company?.display_name || '',
      employer_logo: null,
      employer_website: job.redirect_url || '',
      job_employment_type: job.contract_type || '',
      job_apply_link: job.redirect_url || '',
      job_description: job.description || '',
      job_is_remote: /remote/i.test(job.title || '') || /remote/i.test(job.description || ''),
      job_posted_at_timestamp: job.created ? new Date(job.created).getTime() / 1000 : Date.now() / 1000,
      job_city: job.location?.area?.[0] || job.location?.display_name?.split(',')[0]?.trim() || null,
      job_state: job.location?.area?.[1] || null,
      job_country: 'US',
      job_required_skills: [],
      job_salary_currency: 'USD',
      job_salary_period: 'year',
      job_min_salary: job.salary_min || null,
      job_max_salary: job.salary_max || null,
      source: 'Adzuna',
    }))

    res.json({ jobs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

async function searchWithJooble(req, res, keys) {
  if (!keys.jooble) {
    return res.status(500).json({ error: 'Jooble API key not configured. Add it in Settings.' })
  }

  const { query, location } = req.body

  try {
    const response = await fetch(`https://jooble.org/api/${keys.jooble}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: query, location: location || '' }),
    })

    if (!response.ok) throw new Error(`Jooble API error: ${response.status}`)

    const data = await response.json()
    const jobs = (data.jobs || []).map((job) => ({
      job_title: job.title || '',
      employer_name: job.company || '',
      employer_logo: null,
      employer_website: job.link || '',
      job_employment_type: job.type || '',
      job_apply_link: job.link || '',
      job_description: job.snippet || '',
      job_is_remote: /remote/i.test(job.title || '') || /remote/i.test(job.snippet || '') || job.location === 'Remote',
      job_posted_at_timestamp: job.updated ? new Date(job.updated).getTime() / 1000 : Date.now() / 1000,
      job_city: job.location?.split(',')[0]?.trim() || null,
      job_state: null,
      job_country: '',
      job_required_skills: [],
      job_salary_currency: null,
      job_salary_period: null,
      job_min_salary: null,
      job_max_salary: null,
      source: 'Jooble',
    }))

    res.json({ jobs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

async function searchWithJobicy(req, res) {
  const { query } = req.body

  try {
    const params = new URLSearchParams({ count: '20' })
    if (query) params.set('tag', query)

    const response = await fetch(`https://jobicy.com/api/v2/remote-jobs?${params}`)

    if (!response.ok) throw new Error(`Jobicy API error: ${response.status}`)

    let data
    try { data = await response.json() }
    catch { throw new Error('Invalid JSON from Jobicy') }
    const jobs = (data.jobs || []).map((job) => ({
      job_title: job.jobTitle || job.title || '',
      employer_name: job.companyName || job.company || '',
      employer_logo: job.companyLogo || null,
      employer_website: job.url || '',
      job_employment_type: job.jobType || '',
      job_apply_link: job.url || job.applyUrl || '',
      job_description: job.jobDescription || job.description || '',
      job_is_remote: true,
      job_posted_at_timestamp: job.pubDate ? new Date(job.pubDate).getTime() / 1000 : Date.now() / 1000,
      job_city: null,
      job_state: null,
      job_country: '',
      job_required_skills: [],
      job_salary_currency: null,
      job_salary_period: null,
      job_min_salary: null,
      job_max_salary: null,
      source: 'Jobicy',
    }))

    res.json({ jobs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

app.post('/api/resume/analyse', async (req, res) => {
  const { text, fileName, aiProvider } = req.body
  const keys = getKeys(req)

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Resume text is required' })
  }

  const providers = aiProvider
    ? [{ name: aiProvider, key: keys[aiProvider] }]
    : [
        { name: 'openai', key: keys.openai },
        { name: 'claude', key: keys.claude },
        { name: 'gemini', key: keys.gemini },
      ]

  for (const p of providers) {
    if (!p.key) continue
    try {
      const aiResult = await parseWithAI(text, fileName || 'Uploaded resume', p.key, p.name)
      return res.json(aiResult)
    } catch (error) {
      console.error(`${p.name} parsing failed, trying next:`, error.message || error)
    }
  }

  const result = analyseResumeLocal(text, fileName || 'Uploaded resume')
  res.json(result)
})

async function parseWithAI(text, fileName, apiKey, provider) {
  const DESIGN_KEYWORDS = [
    'visual identity', 'brand guidelines', 'campaign design', 'social media creatives',
    'typography', 'layout systems', 'image editing', 'wireframes', 'user flows',
    'prototyping', 'usability testing', 'design systems', 'responsive design',
    'accessibility', 'stakeholder feedback', 'handoff specs', 'component library',
    'iteration', 'conversion', 'engagement', 'cross-functional',
  ]

  const systemPrompt = `You are a resume analysis expert for design roles. Analyse the resume and return ONLY valid JSON with this exact structure:
{
  "atsScore": number (0-100),
  "bestFit": string,
  "foundKeywords": string[],
  "missingKeywords": string[],
  "skills": [{"name": string, "current": number, "target": number}],
  "atsBreakdown": [{"label": string, "score": number, "note": string}]
}

Priority keywords: ${DESIGN_KEYWORDS.join(', ')}`

  let content

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text.slice(0, 8000) },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`)
    const data = await response.json()
    if (!data?.choices?.[0]?.message?.content) throw new Error('Invalid OpenAI response')
    content = data.choices[0].message.content
  } else if (provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: text.slice(0, 8000) }],
      }),
    })
    if (!response.ok) throw new Error(`Claude API error: ${response.status}`)
    const data = await response.json()
    const text = data?.content?.[0]?.text
    if (!text) throw new Error('Invalid Claude response')
    content = text
  } else if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${text.slice(0, 8000)}` }],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
      }),
    })
    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Invalid Gemini response')
    content = text
  } else {
    throw new Error(`Unknown AI provider: ${provider}`)
  }

  try {
    const cleaned = content.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim()
    return { ...JSON.parse(cleaned), fileName, analysedAt: new Date().toISOString(), aiProvider: provider }
  } catch {
    return analyseResumeLocal(text, fileName)
  }
}

function analyseResumeLocal(text, fileName) {
  const DESIGN_KEYWORDS = [
    'visual identity', 'brand guidelines', 'campaign design', 'social media creatives',
    'typography', 'layout systems', 'image editing', 'wireframes', 'user flows',
    'prototyping', 'usability testing', 'design systems', 'responsive design',
    'accessibility', 'stakeholder feedback', 'handoff specs', 'component library',
    'iteration', 'conversion', 'engagement', 'cross-functional',
  ]

  const SKILL_SIGNALS = {
    'Adobe Illustrator / Photoshop': ['adobe', 'illustrator', 'photoshop', 'creative cloud', 'image editing'],
    'Figma UI design': ['figma', 'prototype', 'ui', 'interface', 'screen', 'wireframe'],
    'Brand identity systems': ['brand', 'branding', 'identity', 'guideline', 'logo', 'typography'],
    'Motion graphics': ['motion', 'animation', 'after effects', 'video', 'reel'],
    'UX research': ['user research', 'usability', 'interview', 'persona', 'journey', 'competitor'],
    'Design systems': ['design system', 'component', 'token', 'handoff', 'library'],
    'Portfolio storytelling': ['case study', 'behance', 'portfolio', 'rationale', 'process'],
    'Accessibility basics': ['accessibility', 'contrast', 'wcag', 'responsive', 'keyboard'],
  }

  const body = String(text || '').toLowerCase()
  const wordCount = body.split(/\s+/).filter(Boolean).length
  const foundKeywords = DESIGN_KEYWORDS.filter((keyword) => body.includes(keyword.toLowerCase()))
  const missingKeywords = DESIGN_KEYWORDS.filter((keyword) => !body.includes(keyword.toLowerCase()))
  const hasMetrics = /\b\d+[%x]?\b|\b(increased|reduced|improved|grew|saved|delivered|launched)\b/i.test(text)
  const hasLinks = /https?:\/\/|behance|linkedin|portfolio|website/i.test(text)
  const hasSections = ['experience', 'projects', 'skills', 'education'].filter((section) => body.includes(section))

  const roleSignals = {
    'Brand / Visual Design': ['brand', 'branding', 'visual', 'graphic', 'poster', 'social', 'campaign', 'adobe', 'canva'],
    'UI/UX Design': ['figma', 'prototype', 'wireframe', 'user', 'ux', 'ui', 'research', 'flow'],
    'Motion / 3D Design': ['motion', 'animation', 'blender', 'maya', '3d', 'video'],
  }

  const bestFit = Object.entries(roleSignals)
    .map(([label, words]) => ({ label, score: words.filter((word) => body.includes(word)).length }))
    .sort((a, b) => b.score - a.score)[0]?.label || 'Design roles'

  const skills = Object.entries(SKILL_SIGNALS).map(([name, words]) => {
    const hits = words.filter((word) => body.includes(word)).length
    const current = clamp(Math.round((hits / words.length) * 85 + (hits ? 10 : 9)))
    return { name, current, target: 80 }
  })

  const atsScore = clamp(
    Math.round(
      28 +
        Math.min(18, wordCount / 35) +
        foundKeywords.length * 1.5 +
        (hasMetrics ? 12 : 0) +
        (hasLinks ? 8 : 0) +
        hasSections.length * 5,
    ),
  )

  return {
    fileName,
    analysedAt: new Date().toISOString(),
    atsScore,
    bestFit,
    foundKeywords,
    missingKeywords,
    skills,
    atsBreakdown: [
      { label: 'Role targeting', score: clamp(bestFit === 'Brand / Visual Design' ? 78 : 68), note: `Strongest detected direction: ${bestFit}. Tighten the headline and summary around that target.` },
      { label: 'Keyword coverage', score: clamp(42 + foundKeywords.length * 4), note: `${foundKeywords.length} priority keywords detected. Add the highest-value missing terms naturally inside bullets and skills.` },
      { label: 'Impact metrics', score: hasMetrics ? 74 : 38, note: hasMetrics ? 'The resume includes measurable language. Add more result numbers where possible.' : 'Few measurable outcomes were detected. Add deliverables, counts, timelines, and engagement results.' },
      { label: 'Project proof', score: hasLinks ? 76 : 52, note: hasLinks ? 'Portfolio/link signals are present.' : 'Add portfolio, Behance, LinkedIn, and project case-study links.' },
      { label: 'ATS readability', score: hasSections.length >= 4 ? 82 : 66, note: `${hasSections.length}/4 core sections detected: experience, projects, skills, education.` },
    ],
  }
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

app.post('/api/scrape/emails', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'url is required' })

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const html = await response.text()
    const emails = [...new Set(html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])]
    res.json({ emails })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ emails: [], error: message })
  }
})

app.get('/api/network-ip', (req, res) => {
  const ip = req.ip || req.socket.address()?.address || 'localhost'
  res.json({ ip, port: process.env.PORT || 3001 })
})

const PORT = process.env.PORT || 3001

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}

export default app
