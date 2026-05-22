import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

function getKeys(req) {
  return {
    jsearch: req.body.apiKeys?.jsearch || process.env.JSEARCH_API_KEY || '',
    apify: req.body.apiKeys?.apify || process.env.APIFY_API_TOKEN || '',
    openai: req.body.apiKeys?.openai || process.env.OPENAI_API_KEY || '',
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

  try {
    const actorId = 'epctex/indeed-scraper'
    const input = {
      query,
      location: location || undefined,
      maxPages: 2,
    }

    const runResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${keys.apify}`,
      },
      body: JSON.stringify({ input }),
    })

    if (!runResponse.ok) {
      throw new Error(`Apify run failed: ${runResponse.status}`)
    }

    const runData = await runResponse.json()
    const runId = runData.data.id

    await waitForApifyRun(runId, keys.apify)

    const datasetResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}/dataset?format=json`, {
      headers: {
        Authorization: `Bearer ${keys.apify}`,
      },
    })

    if (!datasetResponse.ok) {
      throw new Error(`Apify dataset fetch failed: ${datasetResponse.status}`)
    }

    const items = await datasetResponse.json()
    const jobs = (items.data || items).map((item) => ({
      job_title: item.jobTitle || item.title || '',
      employer_name: item.employerName || item.company || '',
      employer_logo: item.employerLogo || item.logo || null,
      employer_website: item.employerWebsite || null,
      job_employment_type: item.employmentType || '',
      job_apply_link: item.url || item.applyLink || '',
      job_description: item.description || '',
      job_is_remote: remote_only || /remote/i.test(item.title || '') || /remote/i.test(item.description || ''),
      job_posted_at_timestamp: item.datePosted ? new Date(item.datePosted).getTime() / 1000 : Date.now() / 1000,
      job_city: item.location ? item.location.split(',')[0]?.trim() : null,
      job_state: null,
      job_country: '',
      job_required_skills: [],
      job_salary_currency: null,
      job_salary_period: null,
      job_min_salary: null,
      job_max_salary: null,
      source: 'Apify',
    }))

    res.json({ jobs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

async function waitForApifyRun(runId, token, maxWait = 60000) {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const statusData = await statusResponse.json()
    const status = statusData.data.status

    if (status === 'SUCCEEDED') return
    if (status === 'FAILED') throw new Error('Apify actor run failed')

    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error('Apify actor run timed out')
}

async function searchWithYC(req, res) {
  const { query } = req.body

  try {
    const response = await fetch('https://www.ycombinator.com/api/jobs')

    if (!response.ok) {
      throw new Error(`YC Jobs API error: ${response.status}`)
    }

    const data = await response.json()
    const jobsList = data.jobs || data

    const filtered = jobsList.filter((job) => {
      const haystack = `${job.title || ''} ${job.company || ''} ${job.description || ''}`.toLowerCase()
      const terms = query.toLowerCase().split(/\s+/)
      return terms.some((term) => haystack.includes(term))
    })

    const jobs = filtered.map((job) => ({
      job_title: job.title || '',
      employer_name: job.company || '',
      employer_logo: job.logo || null,
      employer_website: job.company_url || job.url || '',
      job_employment_type: job.job_type || '',
      job_apply_link: job.apply_url || job.url || '',
      job_description: job.description || '',
      job_is_remote: job.remote || /remote/i.test(job.title || '') || /remote/i.test(job.description || ''),
      job_posted_at_timestamp: job.created_at ? new Date(job.created_at).getTime() / 1000 : Date.now() / 1000,
      job_city: job.location ? job.location.split(',')[0]?.trim() : null,
      job_state: null,
      job_country: '',
      job_required_skills: [],
      job_salary_currency: job.salary_currency || null,
      job_salary_period: job.salary_period || null,
      job_min_salary: job.salary_min || null,
      job_max_salary: job.salary_max || null,
      source: 'YC',
    }))

    res.json({ jobs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}

app.post('/api/resume/analyse', async (req, res) => {
  const { text, fileName } = req.body
  const keys = getKeys(req)

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Resume text is required' })
  }

  if (keys.openai) {
    try {
      const aiResult = await parseWithAI(text, fileName || 'Uploaded resume', keys.openai)
      return res.json(aiResult)
    } catch (error) {
      console.error('AI parsing failed, falling back to local:', error)
    }
  }

  const result = analyseResumeLocal(text, fileName || 'Uploaded resume')
  res.json(result)
})

async function parseWithAI(text, fileName, apiKey) {
  const DESIGN_KEYWORDS = [
    'visual identity', 'brand guidelines', 'campaign design', 'social media creatives',
    'typography', 'layout systems', 'image editing', 'wireframes', 'user flows',
    'prototyping', 'usability testing', 'design systems', 'responsive design',
    'accessibility', 'stakeholder feedback', 'handoff specs', 'component library',
    'iteration', 'conversion', 'engagement', 'cross-functional',
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a resume analysis expert for design roles. Analyse the resume and return ONLY valid JSON with this exact structure:
{
  "atsScore": number (0-100),
  "bestFit": string,
  "foundKeywords": string[],
  "missingKeywords": string[],
  "skills": [{"name": string, "current": number, "target": number}],
  "atsBreakdown": [{"label": string, "score": number, "note": string}]
}

Priority keywords: ${DESIGN_KEYWORDS.join(', ')}`,
        },
        {
          role: 'user',
          content: text.slice(0, 8000),
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`)

  const data = await response.json()
  const content = data.choices[0].message.content

  try {
    return { ...JSON.parse(content), fileName, analysedAt: new Date().toISOString() }
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

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
