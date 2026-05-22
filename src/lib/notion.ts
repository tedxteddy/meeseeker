const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

export interface NotionConfig {
  enabled: boolean
  apiKey: string
  databaseId: string
}

export interface NotionJob {
  id?: string
  notionPageId?: string
  role: string
  company: string
  location: string
  description: string
  source: string
  source_url: string
  compensation: string | null
  required_skills: string[]
  fit_score: number
  growth_score: number
  probability: string
  tags: string[]
  imported_at: string
}

export interface NotionApplication {
  id?: string
  notionPageId?: string
  job_id: string
  stage: string
  notes: string
  applied_at: string | null
  updated_at: string
}

function getNotionHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

export function getNotionConfig(): NotionConfig {
  return {
    enabled: localStorage.getItem('notion_enabled') === 'true',
    apiKey: localStorage.getItem('notion_api_key') || '',
    databaseId: localStorage.getItem('notion_database_id') || '',
  }
}

export function saveNotionConfig(config: NotionConfig) {
  localStorage.setItem('notion_enabled', String(config.enabled))
  localStorage.setItem('notion_api_key', config.apiKey)
  localStorage.setItem('notion_database_id', config.databaseId)
}

export async function verifyNotionConnection(apiKey: string, databaseId: string): Promise<{ success: boolean; error?: string }> {
  if (!apiKey || !databaseId) {
    return { success: false, error: 'API key and Database ID are required' }
  }

  try {
    const response = await fetch(`${NOTION_API_BASE}/databases/${databaseId}`, {
      headers: getNotionHeaders(apiKey),
    })

    if (!response.ok) {
      const error = await response.json()
      if (response.status === 401) {
        return { success: false, error: 'Invalid API key' }
      }
      if (response.status === 404) {
        return { success: false, error: 'Database not found. Make sure the database exists and is shared with your integration.' }
      }
      return { success: false, error: error.message || 'Failed to connect to Notion' }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: 'Network error. Check your connection.' }
  }
}

export async function createNotionJobPage(apiKey: string, databaseId: string, job: NotionJob): Promise<{ pageId: string } | null> {
  try {
    const response = await fetch(`${NOTION_API_BASE}/pages`, {
      method: 'POST',
      headers: getNotionHeaders(apiKey),
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          'Role': { title: [{ text: { content: job.role } }] },
          'Company': { rich_text: [{ text: { content: job.company } }] },
          'Location': { rich_text: [{ text: { content: job.location } }] },
          'Source': { select: { name: job.source } },
          'Fit Score': { number: job.fit_score },
          'Growth Score': { number: job.growth_score },
          'Probability': { select: { name: job.probability } },
          'Compensation': { rich_text: [{ text: { content: job.compensation || '' } }] },
          'Tags': { multi_select: job.tags.map(tag => ({ name: tag })) },
          'Skills Required': { multi_select: job.required_skills.map(skill => ({ name: skill })) },
          'Applied': { checkbox: false },
          'Stage': { select: { name: 'Research' } },
          'Applied Date': { date: null },
          'Source URL': { url: job.source_url },
          'imported_at': { date: { start: job.imported_at } },
        },
        children: job.description ? [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: { rich_text: [{ text: { content: 'Job Description' } }] }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ text: { content: job.description.slice(0, 2000) } }] }
          }
        ] : []
      }),
    })

    if (!response.ok) {
      console.error('Failed to create Notion page:', await response.json())
      return null
    }

    const data = await response.json()
    return { pageId: data.id }
  } catch (err) {
    console.error('Error creating Notion page:', err)
    return null
  }
}

export async function updateNotionApplication(apiKey: string, pageId: string, updates: Partial<NotionApplication>): Promise<boolean> {
  try {
    const properties: Record<string, unknown> = {}

    if (updates.stage) {
      properties['Stage'] = { select: { name: updates.stage } }
    }
    if (updates.applied_at) {
      properties['Applied'] = { checkbox: true }
      properties['Applied Date'] = { date: { start: updates.applied_at } }
    }
    if (updates.notes !== undefined) {
      properties['Notes'] = { rich_text: [{ text: { content: updates.notes } }] }
    }

    const response = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
      method: 'PATCH',
      headers: getNotionHeaders(apiKey),
      body: JSON.stringify({ properties }),
    })

    return response.ok
  } catch (err) {
    console.error('Error updating Notion page:', err)
    return false
  }
}

export async function searchNotionJobs(apiKey: string, databaseId: string): Promise<Array<{ notionPageId: string; job: NotionJob }>> {
  try {
    const response = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: getNotionHeaders(apiKey),
      body: JSON.stringify({
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 100
      }),
    })

    if (!response.ok) {
      console.error('Failed to query Notion database:', await response.json())
      return []
    }

    const data = await response.json()
    const jobs: Array<{ notionPageId: string; job: NotionJob }> = []

    for (const page of data.results) {
      const props = page.properties

      const extractText = (prop: any): string => {
        if (!prop) return ''
        if (prop.type === 'title') return prop.title?.map((t: any) => t.plain_text).join('') || ''
        if (prop.type === 'rich_text') return prop.rich_text?.map((t: any) => t.plain_text).join('') || ''
        return ''
      }

      const extractSelect = (prop: any): string => prop?.select?.name || ''
      const extractNumber = (prop: any): number => prop?.number ?? 0
      const extractMultiSelect = (prop: any): string[] => prop?.multi_select?.map((s: any) => s.name) || []
      const extractCheckbox = (prop: any): boolean => prop?.checkbox ?? false
      const extractUrl = (prop: any): string => prop?.url || ''
      const extractDate = (prop: any): string | null => prop?.date?.start || null

      const job: NotionJob = {
        notionPageId: page.id,
        role: extractText(props['Role']),
        company: extractText(props['Company']),
        location: extractText(props['Location']),
        description: '',
        source: extractSelect(props['Source']),
        source_url: extractUrl(props['Source URL']),
        compensation: extractText(props['Compensation']) || null,
        required_skills: extractMultiSelect(props['Skills Required']),
        fit_score: extractNumber(props['Fit Score']),
        growth_score: extractNumber(props['Growth Score']),
        probability: extractSelect(props['Probability']),
        tags: extractMultiSelect(props['Tags']),
        imported_at: extractDate(props['imported_at']) || new Date().toISOString(),
      }

      jobs.push({ notionPageId: page.id, job })
    }

    return jobs
  } catch (err) {
    console.error('Error searching Notion jobs:', err)
    return []
  }
}

export async function syncJobsToNotion(apiKey: string, databaseId: string, jobs: NotionJob[]): Promise<{ synced: number; failed: number }> {
  let synced = 0
  let failed = 0

  for (const job of jobs) {
    const result = await createNotionJobPage(apiKey, databaseId, job)
    if (result) {
      synced++
    } else {
      failed++
    }
  }

  return { synced, failed }
}