const API_BASE = '/api'
const CACHE_TTL = 5 * 60 * 1000

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

function cacheKey(params: Record<string, unknown>): string {
  const parts = ['query', 'source', 'location', 'remote_only', 'date_posted', 'job_type']
  const str = parts.map(k => `${k}=${params[k] ?? ''}`).join('|')
  return `search_cache:${str}`
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() - entry.ts > CACHE_TTL) {
      localStorage.removeItem(key)
      return null
    }
    return entry.data as T
  } catch {
    return null
  }
}

function cacheSet<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch (e) {
    console.warn('Cache write failed:', e)
  }
}

export async function searchJobs(params: Record<string, unknown>) {
  const key = cacheKey(params)
  const cached = cacheGet<{ jobs: unknown[] }>(key)
  if (cached) return cached

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
    const data = await response.json()
    if (data.jobs && data.jobs.length > 0) cacheSet(key, data)
    return data
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

export async function searchJobsLinkedIn(params: Record<string, unknown>) {
  return searchJobs({ ...params, source: 'linkedin' })
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
    linkedin: !!keys.apify,
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
  return [s.jsearch, s.apify, s.linkedin, s.adzuna, s.jooble, s.jobicy].filter(Boolean).length
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
  const roleBase = (bestFit || '').trim()
  const strongSkills = skills.filter(s => s.current >= 50).slice(0, 4).map(s => s.name)
  const rawQuery = roleBase || strongSkills.join(' ') || 'designer'
  const lower = rawQuery.toLowerCase()
  const hasDesignSignal = [
    'design', 'designer', 'ui', 'ux', 'figma', 'brand', 'visual', 'graphic', 'product'
  ].some(token => lower.includes(token))
  const query = hasDesignSignal ? rawQuery : `${rawQuery} designer`

  const sources = [
    { key: 'jsearch', fn: (q: string, loc?: string) => searchJobs({ query: q, location: loc, remote_only: true }), hasKey: status.jsearch },
    { key: 'yc', fn: (q: string, loc?: string) => searchJobsYC({ query: q, location: loc }), hasKey: true },
    { key: 'linkedin', fn: (q: string, loc?: string) => searchJobsLinkedIn({ query: q, location: loc }), hasKey: status.linkedin },
    { key: 'adzuna', fn: (q: string, loc?: string) => searchJobsAdzuna({ query: q, location: loc }), hasKey: status.adzuna },
    { key: 'jooble', fn: (q: string, loc?: string) => searchJobsJooble({ query: q, location: loc }), hasKey: status.jooble },
    { key: 'jobicy', fn: (q: string) => searchJobsJobicy({ query: q }), hasKey: true },
    { key: 'apify', fn: (q: string, loc?: string) => searchJobsApify({ query: q, location: loc }), hasKey: status.apify },
  ]

  const availableSources = sources.filter(s => s.hasKey)

  async function searchWithRetry(q: string, loc?: string) {
    const results = await Promise.allSettled(availableSources.map(s => s.fn(q, loc)))
    const jobs: AutoSearchResult['jobs'] = []
    const zeroResults: typeof availableSources = []
    const errors: string[] = []

    results.forEach((result, i) => {
      const src = availableSources[i]
      if (result.status === 'fulfilled' && result.value.jobs?.length > 0) {
        jobs.push(...result.value.jobs)
      } else if (result.status === 'fulfilled' && result.value.jobs?.length === 0) {
        zeroResults.push(src)
      } else if (result.status === 'rejected') {
        errors.push(`${src.key}: ${result.reason?.message || result.reason || 'Unknown error'}`)
      }
    })

    if (zeroResults.length > 0 && q.split(' ').length > 1) {
      const broader = q.split(' ').slice(0, -1).join(' ') || q.split(' ')[0]
      const retryResults = await Promise.allSettled(zeroResults.map(s => s.fn(broader, loc)))
      retryResults.forEach((result, i) => {
        const src = zeroResults[i]
        if (result.status === 'fulfilled' && result.value.jobs?.length > 0) {
          jobs.push(...result.value.jobs)
        } else if (result.status === 'rejected') {
          errors.push(`${src.key} (retry): ${result.reason?.message || result.reason || 'Unknown error'}`)
        }
      })
    }

    return { jobs, errors }
  }

  const { jobs: rawJobs, errors } = await searchWithRetry(query, location)

  const seen = new Set<string>()
  const deduped = rawJobs.filter(j => {
    const key = `${j.job_title}|${j.employer_name}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const prioritized = deduped.sort((a, b) => {
    const order = ['jsearch', 'adzuna', 'linkedin', 'jooble', 'apify', 'jobicy', 'YC']
    return (order.indexOf(a.source) - order.indexOf(b.source))
  })

  const sourcesWithResults = [...new Set(prioritized.map(j => j.source))]

  return {
    jobs: prioritized,
    sources_searched: availableSources.map(s => s.key),
    sources_with_results: sourcesWithResults,
    total_found: prioritized.length,
    errors,
  }
}
