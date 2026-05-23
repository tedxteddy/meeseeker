import { useState, FormEvent, useMemo, useEffect } from 'react'
import { searchJobs, searchJobsApify, searchJobsYC, searchJobsAdzuna, searchJobsJooble, searchJobsJobicy, getApiKeyStatus, scrapeEmails } from '../lib/api'
import { store } from '../lib/store'
import { useResumes } from '../hooks/useData'

interface SearchResult {
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
  source?: string
}

interface JobsViewProps {
  jobs: Array<{ id: string; role: string; company: string; location: string; description: string; source: string; source_url: string; compensation: string | null; required_skills: string[]; fit_score: number; growth_score: number; probability: string; tags: string[] }>
  applications: Array<{ id: string; job_id: string; stage: string }>
  onAddApplication: (jobId: string, stage?: string) => void
  onDeleteJob: (id: string) => void
  onJobImported: () => void
  initialSearchResults?: import('../lib/api').AutoSearchResult | null
  onClearAutoResults?: () => void
}

const PAGE_SIZE = 10

const WORK_ARRANGEMENTS = [
  { key: 'any', label: 'Any', icon: '&#9899;' },
  { key: 'remote', label: 'Remote', icon: '&#127760;' },
  { key: 'hybrid', label: 'Hybrid', icon: '&#127795;' },
  { key: 'office', label: 'Office', icon: '&#127970;' },
] as const

export default function JobsView({ jobs, applications, onAddApplication, onDeleteJob, onJobImported, initialSearchResults, onClearAutoResults }: JobsViewProps) {
  const apiStatus = getApiKeyStatus()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [searchRemote, setSearchRemote] = useState(true)
  const [searchSource, setSearchSource] = useState('jsearch')
  const [workArrangement, setWorkArrangement] = useState<'any' | 'remote' | 'hybrid' | 'office'>('any')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [filterSeniority, setFilterSeniority] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState('')
  const [skillWeights, setSkillWeights] = useState<Record<string, 'must' | 'nice'>>({})
  const [scrapingEmails, setScrapingEmails] = useState<string | null>(null)
  const [scrapedEmails, setScrapedEmails] = useState<Record<string, string[]>>({})
  const [autoResults, setAutoResults] = useState<SearchResult[]>(initialSearchResults?.jobs || [])

  useEffect(() => {
    if (initialSearchResults?.jobs) {
      setAutoResults(initialSearchResults.jobs)
    }
  }, [initialSearchResults])

  const { latest: latestResume } = useResumes()

  function handleSaveResult(result: SearchResult) {
    const compensation = result.job_min_salary && result.job_max_salary
      ? `${result.job_salary_currency || ''} ${result.job_min_salary} - ${result.job_max_salary} ${result.job_salary_period || ''}`.trim()
      : null

    const resumeSkills = latestResume?.skills.map(s => s.name.toLowerCase()) || []
    const jobSkills = result.job_required_skills || []
    const matchedSkills = jobSkills.filter(s => resumeSkills.includes(s.toLowerCase()))
    const fit = jobSkills.length > 0 ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 50

    store.addJob({
      role: result.job_title || 'Unknown role',
      company: result.employer_name || 'Unknown company',
      location: [result.job_city, result.job_state, result.job_country].filter(Boolean).join(', ') || 'Remote',
      description: result.job_description || '',
      source: result.source || 'JSearch',
      source_url: result.job_apply_link || '',
      compensation,
      required_skills: jobSkills,
      fit_score: fit,
      growth_score: 70,
      probability: fit >= 70 ? 'High' : fit >= 40 ? 'Medium' : 'Low',
      tags: result.job_is_remote ? ['remote'] : [],
    })

    onJobImported()
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    setError('')
    setSearchResults([])

    try {
      const searchFn =
        searchSource === 'apify' ? searchJobsApify :
        searchSource === 'yc' ? searchJobsYC :
        searchSource === 'adzuna' ? searchJobsAdzuna :
        searchSource === 'jooble' ? searchJobsJooble :
        searchSource === 'jobicy' ? searchJobsJobicy :
        searchJobs
      const data = await searchFn({
        query: searchQuery,
        location: searchLocation || undefined,
        remote_only: searchRemote || undefined,
      })
      setSearchResults(data.jobs || [])
      setCurrentPage(1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const skills = job.required_skills || []
    const tags = job.tags || []
    const haystack = `${job.role} ${job.company} ${job.location} ${skills.join(' ')}`.toLowerCase()
    if (filterQuery && !haystack.includes(filterQuery.toLowerCase())) return false
    if (filterSeniority === 'remote' && !tags.includes('remote')) return false
    if (workArrangement !== 'any') {
      const jobLocationLower = job.location.toLowerCase()
      const jobTags = tags.map(t => t.toLowerCase())
      if (workArrangement === 'remote' && !jobTags.includes('remote') && !jobLocationLower.includes('remote')) return false
      if (workArrangement === 'hybrid' && !jobLocationLower.includes('hybrid') && !jobLocationLower.includes('flex')) return false
      if (workArrangement === 'office' && (jobTags.includes('remote') || jobLocationLower.includes('remote') || jobLocationLower.includes('hybrid'))) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE))
  const start = (currentPage - 1) * PAGE_SIZE
  const pageJobs = filteredJobs.slice(start, start + PAGE_SIZE)

  function formatDate(timestamp: number) {
    if (!timestamp) return 'Unknown'
    const d = new Date(timestamp * 1000)
    const diff = Date.now() - d.getTime()
    const hrs = Math.round(diff / 3600000)
    if (hrs < 1) return 'Just now'
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.round(hrs / 24)
    return days < 7 ? `${days}d ago` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function inferSeniority(title: string, desc: string) {
    const t = (title + ' ' + desc).toLowerCase()
    if (/\b(vp|vice president|chief|director|head of)\b/.test(t)) return 'Director'
    if (/\b(senior|sr\.?|staff|principal|lead)\b/.test(t)) return 'Senior'
    if (/\b(mid)\b/.test(t)) return 'Mid'
    if (/\b(junior|jr\.?|entry|associate|intern)\b/.test(t)) return 'Entry'
    return 'Mid'
  }

  function seniorityTagClass(sen: string) {
    return { Entry: 'tag-entry', Mid: 'tag-mid', Senior: 'tag-senior', Director: 'tag-director' }[sen] || ''
  }

  function getMatchBreakdown(job: { role: string; description: string; required_skills: string[]; location: string; tags: string[] }) {
    const resumeSkills = latestResume?.skills.map(s => ({ name: s.name.toLowerCase(), level: s.current })) || []
    const resumeSkillNames = resumeSkills.map(s => s.name)

    // Skills match
    const jobSkills = job.required_skills || []
    const skillDetails = jobSkills.map(s => ({
      skill: s,
      matched: resumeSkillNames.includes(s.toLowerCase()),
      weight: skillWeights[s] || 'nice',
    }))
    const matchedSkills = skillDetails.filter(s => s.matched)
    const mustHaveMatch = skillDetails.filter(s => s.weight === 'must')
    const mustMatched = mustHaveMatch.filter(s => s.matched)
    const skillsScore = jobSkills.length > 0
      ? Math.round(((matchedSkills.length / jobSkills.length) * 0.6 + (mustHaveMatch.length > 0 ? (mustMatched.length / mustHaveMatch.length) * 0.4 : 0.4)) * 100)
      : 50

    // Experience match
    const sen = inferSeniority(job.role, job.description)
    const resumeHasSenior = (latestResume?.text_content || '').toLowerCase().match(/\b(senior|sr\.?|staff|principal|lead)\b/)
    const resumeHasJunior = (latestResume?.text_content || '').toLowerCase().match(/\b(junior|jr\.?|entry|associate|intern)\b/)
    const expScore = sen === 'Director' ? 60 : sen === 'Senior' ? (resumeHasSenior ? 90 : 60) : sen === 'Entry' ? (resumeHasJunior ? 90 : 70) : 80

    // Location fit
    const isRemote = job.tags.includes('remote') || job.location.toLowerCase().includes('remote')
    const locationScore = isRemote ? 100 : 70

    // Skills to add
    const skillsToAdd = skillDetails.filter(s => !s.matched).map(s => s.skill)

    // Overall score
    const overall = Math.round(skillsScore * 0.5 + expScore * 0.3 + locationScore * 0.2)

    return { skillsScore, expScore, locationScore, overall, skillDetails, skillsToAdd }
  }

  function toggleSkillWeight(skill: string) {
    setSkillWeights(prev => ({
      ...prev,
      [skill]: prev[skill] === 'must' ? 'nice' : 'must',
    }))
  }

  function hasApplied(jobId: string) {
    return applications.some(a => a.job_id === jobId)
  }

  function extractEmails(text: string): string[] {
    return text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
  }

  function isLinkedInUrl(url: string) {
    return /linkedin\.com/i.test(url)
  }

  function handleApply(result: SearchResult) {
    if (result.job_apply_link) window.open(result.job_apply_link, '_blank', 'noopener,noreferrer')
    handleSaveResult(result)
  }

  async function handleScrapeEmails(jobId: string, url: string) {
    if (!url || !url.startsWith('http')) return
    try { new URL(url) } catch { return }
    setScrapingEmails(jobId)
    try {
      const emails = await scrapeEmails(url)
      setScrapedEmails(prev => ({ ...prev, [jobId]: emails }))
    } catch {
      setScrapedEmails(prev => ({ ...prev, [jobId]: [] }))
    } finally {
      setScrapingEmails(null)
    }
  }

  return (
    <>
      <form onSubmit={handleSearch} className="controls">
        <select className="filter-select" value={searchSource} onChange={e => setSearchSource(e.target.value)}>
          <option value="jsearch">JSearch {apiStatus.jsearch ? '' : '(needs key)'}</option>
          <option value="apify">Apify {apiStatus.apify ? '' : '(needs key)'}</option>
          <option value="adzuna">Adzuna {apiStatus.adzuna ? '' : '(needs key)'}</option>
          <option value="jooble">Jooble {apiStatus.jooble ? '' : '(needs key)'}</option>
          <option value="jobicy">Jobicy (free)</option>
          <option value="yc">YC Jobs (free)</option>
        </select>
        <div className="search-wrap">
          <span className="search-icon">&#128269;</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search roles, companies, skills..."
            required
          />
        </div>
        <input
          type="text"
          value={searchLocation}
          onChange={e => setSearchLocation(e.target.value)}
          placeholder="Location (optional)"
          style={{ padding: '8px 10px', borderRadius: 0, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none', minWidth: 120 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-2)', marginRight: 4 }}>Work:</span>
          {WORK_ARRANGEMENTS.map(arr => (
            <button
              key={arr.key}
              type="button"
              onClick={() => setWorkArrangement(arr.key)}
              style={{
                padding: '6px 10px', borderRadius: 0, border: 'none', fontSize: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 500,
                background: workArrangement === arr.key ? 'var(--accent)' : 'var(--surface-2)',
                color: workArrangement === arr.key ? '#fff' : 'var(--text-2)',
                transition: 'all 0.15s'
              }}
              title={arr.label}
            >
              <span dangerouslySetInnerHTML={{ __html: arr.icon }} style={{ marginRight: 3 }} />
              {arr.label}
            </button>
          ))}
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={searching}>
          {searching ? <><span className="spinner"></span> Searching...</> : 'Search'}
        </button>
      </form>

      {autoResults.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="stats-bar">
              <span><strong>{autoResults.length}</strong> jobs matched to your resume</span>
              <span className="source-indicator" style={{ fontSize: 10 }}>from {initialSearchResults?.sources_with_results?.join(', ') || 'multiple sources'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-green btn-sm" onClick={() => {
                autoResults.forEach(r => handleSaveResult(r))
                setAutoResults([])
                onClearAutoResults?.()
              }}>
                &#128190; Save All
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => { setAutoResults([]); onClearAutoResults?.() }}>
                &#215; Dismiss
              </button>
            </div>
          </div>
          <div className="job-grid">
            {autoResults.slice(0, 10).map((result, i) => {
              const emails = extractEmails(result.job_description || '')
              return (
              <div key={i} className="job-card">
                <div className="job-main">
                  <div className="job-title" style={{ cursor: result.job_apply_link ? 'pointer' : undefined, color: result.job_apply_link ? 'var(--accent)' : undefined }}
                    onClick={() => handleApply(result)}>
                    {result.job_title}
                  </div>
                  <div className="job-meta">
                    <span className="company-name">{result.employer_name}</span>
                    <span>{result.job_city || result.job_country || 'Remote'}</span>
                  </div>
                  <div className="job-tags">
                    {result.job_is_remote && <span className="tag tag-remote">Remote</span>}
                    <span className="tag tag-source">{result.source}</span>
                    {result.job_required_skills?.slice(0, 2).map((s, si) => <span key={si} className="tag">{s}</span>)}
                  </div>
                </div>
                <div className="job-right" style={{ gap: 4 }}>
                  <span className="job-date">{formatDate(result.job_posted_at_timestamp)}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {result.job_apply_link && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleApply(result)}>
                        Apply
                      </button>
                    )}
                    {emails.length > 0 && (
                      <a href={`mailto:${emails[0]}`} className="btn btn-outline btn-sm" title={`Apply via ${emails[0]}`}>
                        &#9993;
                      </a>
                    )}
                    <button className="btn btn-green btn-sm" onClick={() => { handleSaveResult(result); setAutoResults(prev => prev.filter((_, idx) => idx !== i)) }}>
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="stats-bar">
            <span>{searchResults.length} results from <strong>{{
              jsearch: 'JSearch', apify: 'Apify', yc: 'YC Jobs',
              adzuna: 'Adzuna', jooble: 'Jooble', jobicy: 'Jobicy',
            }[searchSource] || searchSource}</strong></span>
          </div>
          <div className="job-grid">
            {searchResults.slice(0, 10).map((result, i) => {
              const emails = extractEmails(result.job_description || '')
              return (
              <div key={i} className="job-card">
                <div className="job-main">
                  <div className="job-title" style={{ cursor: result.job_apply_link ? 'pointer' : undefined, color: result.job_apply_link ? 'var(--accent)' : undefined }}
                    onClick={() => handleApply(result)}>
                    {result.job_title}
                  </div>
                  <div className="job-meta">
                    <span className="company-name">{result.employer_name}</span>
                    <span>{result.job_city || result.job_country || 'Remote'}</span>
                  </div>
                  <div className="job-tags">
                    {result.job_is_remote && <span className="tag tag-remote">Remote</span>}
                    <span className="tag tag-source">{result.source || searchSource}</span>
                  </div>
                </div>
                <div className="job-right" style={{ gap: 4 }}>
                  <span className="job-date">{formatDate(result.job_posted_at_timestamp)}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {result.job_apply_link && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleApply(result)}>
                        Apply
                      </button>
                    )}
                    {emails.length > 0 && (
                      <a href={`mailto:${emails[0]}`} className="btn btn-outline btn-sm" title={`Apply via ${emails[0]}`}>
                        &#9993;
                      </a>
                    )}
                    <button className="btn btn-green btn-sm" onClick={() => handleSaveResult(result)}>
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {error && <div className="toast error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="controls">
        <div className="search-wrap">
          <span className="search-icon">&#128269;</span>
          <input
            type="text"
            value={filterQuery}
            onChange={e => { setFilterQuery(e.target.value); setCurrentPage(1) }}
            placeholder="Filter tracked jobs..."
          />
        </div>
        <div className="filter-group">
          <select className="filter-select" value={filterSeniority} onChange={e => { setFilterSeniority(e.target.value); setCurrentPage(1) }}>
            <option value="">All</option>
            <option value="remote">Remote only</option>
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            {WORK_ARRANGEMENTS.slice(1).map(arr => (
              <button
                key={arr.key}
                type="button"
                onClick={() => {
                  setWorkArrangement(workArrangement === arr.key ? 'any' : arr.key)
                  setCurrentPage(1)
                }}
                style={{
                  padding: '5px 10px', borderRadius: 0, border: '1px solid var(--border)', fontSize: 10, cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 500,
                  background: workArrangement === arr.key ? 'var(--accent)' : 'transparent',
                  color: workArrangement === arr.key ? '#fff' : 'var(--text-2)',
                  transition: 'all 0.15s'
                }}
                title={arr.label}
              >
                <span dangerouslySetInnerHTML={{ __html: arr.icon }} style={{ marginRight: 3 }} />
                {arr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-bar">
        <span>Showing <strong>{filteredJobs.length}</strong> tracked jobs</span>
        <span className="stat-chip">Remote <strong>{jobs.filter(j => j.tags.includes('remote')).length}</strong></span>
        {workArrangement !== 'any' && <span className="stat-chip" style={{ background: 'var(--accent)', color: '#fff' }}>Filter: {workArrangement}</span>}
      </div>

      {pageJobs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">&#128188;</div>
          <h3>No jobs tracked yet</h3>
          <p>Search for jobs above and save them to your dashboard.</p>
        </div>
      ) : (
        <div className="job-grid">
          {pageJobs.map(job => {
            const sen = inferSeniority(job.role, job.description)
            const isSelected = selectedJob === job.id

            return (
              <div key={job.id}>
                <div
                  className={`job-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedJob(isSelected ? null : job.id)}
                >
                  <div className="job-main">
                    <div className="job-title">{job.role}</div>
                    <div className="job-meta">
                      <span className="company-name">{job.company}</span>
                      <span>{job.location}</span>
                    </div>
                    <div className="job-tags">
                      <span className={`tag ${seniorityTagClass(sen)}`}>{sen}</span>
                      {job.tags.includes('remote') && <span className="tag tag-remote">Remote</span>}
                      <span className="tag tag-source">{job.source}</span>
                      {job.compensation && <span className="tag">{job.compensation}</span>}
                    </div>
                  </div>
                  <div className="job-right">
                    <span className="job-date">{job.fit_score}% fit</span>
                    {hasApplied(job.id) ? (
                      <span style={{ fontSize: 10, color: 'var(--green)' }}>Applied</span>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); onAddApplication(job.id, 'Research') }}>
                        Track
                      </button>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="detail-panel open">
                    <div className="detail-header">
                      <div>
                        <div className="detail-title">{job.role}</div>
                        <div className="detail-company">{job.company}</div>
                      </div>
                      <button className="detail-close" onClick={() => setSelectedJob(null)}>&times;</button>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-item"><label>Location</label><div className="value">{job.location}</div></div>
                      <div className="detail-item"><label>Source</label><div className="value">{job.source}</div></div>
                      <div className="detail-item"><label>Fit</label><div className="value">{job.fit_score}%</div></div>
                      <div className="detail-item"><label>Growth</label><div className="value">{job.growth_score}/100</div></div>
                    </div>

                    {/* Match Breakdown */}
                    {(() => {
                      const breakdown = getMatchBreakdown(job)
                      return (
                        <div style={{ background: 'var(--surface)', borderRadius: 0, padding: 12, marginBottom: 12, border: '1px solid var(--border)' }}>
                          <h4 style={{ fontSize: 12, margin: '0 0 8px 0' }}>Match Breakdown</h4>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 0, background: breakdown.overall >= 70 ? 'rgba(34,197,94,0.1)' : breakdown.overall >= 40 ? 'rgba(255,159,28,0.1)' : 'rgba(239,68,68,0.1)' }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: breakdown.overall >= 70 ? 'var(--green)' : breakdown.overall >= 40 ? 'var(--orange)' : 'var(--red)' }}>{breakdown.overall}%</div>
                              <div style={{ fontSize: 10, color: 'var(--text-2)' }}>Overall</div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 0, background: 'rgba(0,0,0,0.03)' }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: breakdown.skillsScore >= 70 ? 'var(--green)' : breakdown.skillsScore >= 40 ? 'var(--orange)' : 'var(--red)' }}>{breakdown.skillsScore}%</div>
                              <div style={{ fontSize: 10, color: 'var(--text-2)' }}>Skills</div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 0, background: 'rgba(0,0,0,0.03)' }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: breakdown.expScore >= 70 ? 'var(--green)' : breakdown.expScore >= 40 ? 'var(--orange)' : 'var(--red)' }}>{breakdown.expScore}%</div>
                              <div style={{ fontSize: 10, color: 'var(--text-2)' }}>Experience</div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 0, background: 'rgba(0,0,0,0.03)' }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: breakdown.locationScore >= 70 ? 'var(--green)' : 'var(--orange)' }}>{breakdown.locationScore}%</div>
                              <div style={{ fontSize: 10, color: 'var(--text-2)' }}>Location</div>
                            </div>
                          </div>
                          {/* Weighted skills */}
                          {breakdown.skillDetails.length > 0 && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>Required skills — click to toggle must-have/nice-to-have</span>
                              </div>
                              <div className="skills-cloud" style={{ gap: 4 }}>
                                {breakdown.skillDetails.map((s, si) => (
                                  <span key={si}
                                    onClick={() => toggleSkillWeight(s.skill)}
                                    className={`skill-tag ${s.matched ? 'matched' : ''}`}
                                    style={{
                                      cursor: 'pointer',
                                      fontSize: 11,
                                      borderColor: s.weight === 'must' ? 'var(--blue)' : s.matched ? 'var(--green)' : 'var(--border)',
                                      ...(s.weight === 'must' ? { borderWidth: 2 } : {}),
                                    }}
                                    title={`${s.weight === 'must' ? 'Must-have' : 'Nice-to-have'}${s.matched ? ' ✓ matched' : ''}`}
                                  >
                                    {s.skill}
                                    {s.weight === 'must' && ' ★'}
                                    {!s.matched && ' +'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Skills to add */}
                          {breakdown.skillsToAdd.length > 0 && (
                            <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,159,28,0.08)', borderRadius: 0 }}>
                              <span style={{ fontSize: 11, color: 'var(--orange)' }}>
                                &#128161; Consider adding: {breakdown.skillsToAdd.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {(job.required_skills || []).length > 0 && (
                      <div className="skills-cloud" style={{ marginBottom: 10 }}>
                        {(job.required_skills || []).map((s, i) => <span key={i} className="skill-tag">{s}</span>)}
                      </div>
                    )}
                    {job.description && (
                      <div className="detail-desc">{job.description.slice(0, 2000)}</div>
                    )}
                    <div className="detail-actions">
                      {(() => {
                        const detailEmails = extractEmails(job.description)
                        const isLinkedIn = job.source_url && isLinkedInUrl(job.source_url)
                        const scraped = scrapedEmails[job.id]
                        return (
                          <>
                            {job.source_url && !isLinkedIn && (
                              <a className="btn btn-primary btn-sm" href={job.source_url} target="_blank" rel="noreferrer">
                                Apply &#8599;
                              </a>
                            )}
                            {isLinkedIn && (
                              <a className="btn btn-primary btn-sm" href={job.source_url!} target="_blank" rel="noreferrer"
                                style={{ background: '#0a66c2', borderColor: '#0a66c2' }}>
                                &#8599; Apply on LinkedIn
                              </a>
                            )}
                            {detailEmails.length > 0 && (
                              <a className="btn btn-outline btn-sm" href={`mailto:${detailEmails[0]}?subject=Application for ${job.role} at ${job.company}`}>
                                &#9993; Email Apply
                              </a>
                            )}
                            {scraped && scraped.length > 0 && scraped.map((email, ei) => (
                              <a key={ei} className="btn btn-outline btn-sm" href={`mailto:${email}?subject=Application for ${job.role} at ${job.company}`}>
                                &#9993; {email}
                              </a>
                            ))}
                            {job.source_url && (
                              <button className="btn btn-outline btn-sm"
                                onClick={() => handleScrapeEmails(job.id, job.source_url!)}
                                disabled={scrapingEmails === job.id}
                                title="Scrape job page for contact emails">
                                {scrapingEmails === job.id ? <><span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }}></span> Scanning...</> : '&#128269; Find Emails'}
                              </button>
                            )}
                          </>
                        )
                      })()}
                      <button className="btn btn-outline btn-sm" onClick={() => { onAddApplication(job.id, 'Research'); setSelectedJob(null) }}>
                        Track
                      </button>
                      <button className="btn btn-sm" style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)' }} onClick={() => { onDeleteJob(job.id); setSelectedJob(null) }}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
