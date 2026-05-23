const API_BASE = '/api'

function getApiKeys() {
  return {
    jsearch: localStorage.getItem('api_jsearch') || '',
    apify: localStorage.getItem('api_apify') || '',
    openai: localStorage.getItem('api_openai') || '',
    adzuna: localStorage.getItem('api_adzuna') || '',
    jooble: localStorage.getItem('api_jooble') || '',
    claude: localStorage.getItem('api_claude') || '',
    gemini: localStorage.getItem('api_gemini') || '',
  }
}

export async function searchJobs(params: Record<string, unknown>) {
  const keys = getApiKeys()
  const response = await fetch(`${API_BASE}/jobs/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, apiKeys: keys }),
  })

  if (!response.ok) {
    let msg = 'Search failed'
    try { msg = (await response.json()).error || msg } catch { /* ignore */ }
    throw new Error(msg)
  }

  try {
    return await response.json()
  } catch {
    throw new Error('Invalid JSON response from server')
  }
}

export async function searchJobsApify(params: Record<string, unknown>) {
  return searchJobs({ ...params, source: 'apify' })
}

export async function searchJobsYC(params: Record<string, unknown>) {
  return searchJobs({ ...params, source: 'yc' })
}

export async function searchJobsAdzuna(params: Record<string, unknown>) {
  return searchJobs({ ...params, source: 'adzuna' })
}

export async function searchJobsJooble(params: Record<string, unknown>) {
  return searchJobs({ ...params, source: 'jooble' })
}

export async function searchJobsJobicy(params: Record<string, unknown>) {
  return searchJobs({ ...params, source: 'jobicy' })
}

export async function analyseResume(text: string, fileName = 'Uploaded resume', aiProvider?: string) {
  const keys = getApiKeys()
  const response = await fetch(`${API_BASE}/resume/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, fileName, aiProvider, apiKeys: keys }),
  })

  if (!response.ok) {
    let msg = 'Analysis failed'
    try { msg = (await response.json()).error || msg } catch { /* ignore */ }
    throw new Error(msg)
  }

  try {
    return await response.json()
  } catch {
    throw new Error('Invalid JSON response from server')
  }
}

export function saveApiKey(provider: string, key: string) {
  localStorage.setItem(`api_${provider}`, key)
}

export function getApiKeyStatus() {
  const keys = getApiKeys()
  return {
    jsearch: !!keys.jsearch,
    apify: !!keys.apify,
    openai: !!keys.openai,
    adzuna: !!keys.adzuna,
    jooble: !!keys.jooble,
    jobicy: true,
    claude: !!keys.claude,
    gemini: !!keys.gemini,
  }
}

export function getJobApiCount() {
  const s = getApiKeyStatus()
  return [s.jsearch, s.apify, s.adzuna, s.jooble, s.jobicy].filter(Boolean).length
}

export async function scrapeEmails(url: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/scrape/emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!response.ok) {
    let msg = 'Scrape failed'
    try { msg = (await response.json()).error || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  try {
    const data = await response.json()
    return data.emails || []
  } catch {
    return []
  }
}

export interface AutoSearchResult {
  jobs: Array<{
    job_title: string
    employer_name: string
    employer_logo: string | null
    job_apply_link: string
    job_description: string
    job_is_remote: boolean
    job_posted_at_timestamp: number
    job_city: string | null
    job_state: string | null
    job_country: string
    job_required_skills: string[] | null
    job_salary_currency?: string
    job_salary_period?: string
    job_min_salary?: number
    job_max_salary?: number
    source: string
  }>
  sources_searched: string[]
  sources_with_results: string[]
  total_found: number
  errors: string[]
}

export async function findJobsFromResume(
  bestFit: string,
  skills: Array<{ name: string; current: number }>,
  location?: string
): Promise<AutoSearchResult> {
  const status = getApiKeyStatus()
  const query = bestFit || skills.slice(0, 3).map(s => s.name).join(' ')
  const skillTerms = skills.filter(s => s.current >= 50).slice(0, 5).map(s => s.name)

  const sources = [
    { key: 'jsearch', fn: () => searchJobs({ query, location, remote_only: true }), hasKey: status.jsearch },
    { key: 'yc', fn: () => searchJobsYC({ query, location }), hasKey: true },
    { key: 'adzuna', fn: () => searchJobsAdzuna({ query, location }), hasKey: status.adzuna },
    { key: 'jooble', fn: () => searchJobsJooble({ query, location }), hasKey: status.jooble },
    { key: 'jobicy', fn: () => searchJobsJobicy({ query }), hasKey: true },
    { key: 'apify', fn: () => searchJobsApify({ query, location }), hasKey: status.apify },
  ]

  const availableSources = sources.filter(s => s.hasKey)
  const results = await Promise.allSettled(availableSources.map(s => s.fn()))

  const allJobs: AutoSearchResult['jobs'] = []
  const sourcesWithResults: string[] = []
  const errors: string[] = []

  results.forEach((result, i) => {
    const src = availableSources[i]
    if (result.status === 'fulfilled' && result.value.jobs?.length > 0) {
      sourcesWithResults.push(src.key)
      allJobs.push(...result.value.jobs)
    } else if (result.status === 'rejected') {
      errors.push(`${src.key}: ${result.reason?.message || result.reason}`)
    }
  })

  const seen = new Set<string>()
  const deduped = allJobs.filter(j => {
    const key = `${j.job_title}|${j.employer_name}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const prioritized = deduped.sort((a, b) => {
    const order = ['jsearch', 'adzuna', 'jooble', 'apify', 'jobicy', 'YC']
    return (order.indexOf(a.source) - order.indexOf(b.source))
  })

  return {
    jobs: prioritized,
    sources_searched: availableSources.map(s => s.key),
    sources_with_results: sourcesWithResults,
    total_found: prioritized.length,
    errors,
  }
}
