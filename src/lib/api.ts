const API_BASE = '/api'

function getApiKeys() {
  return {
    jsearch: localStorage.getItem('api_jsearch') || '',
    apify: localStorage.getItem('api_apify') || '',
    openai: localStorage.getItem('api_openai') || '',
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
    const error = await response.json()
    throw new Error(error.error || 'Search failed')
  }

  return response.json()
}

export async function searchJobsApify(params: Record<string, unknown>) {
  return searchJobs({ ...params, source: 'apify' })
}

export async function searchJobsYC(params: Record<string, unknown>) {
  return searchJobs({ ...params, source: 'yc' })
}

export async function analyseResume(text: string, fileName = 'Uploaded resume') {
  const keys = getApiKeys()
  const response = await fetch(`${API_BASE}/resume/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, fileName, apiKeys: keys }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Analysis failed')
  }

  return response.json()
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
  }
}
