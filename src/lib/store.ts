const STORAGE_KEY = 'career-intel-data'

export interface StoredData {
  jobs: Job[]
  applications: Application[]
  resumes: Resume[]
  networkTargets: NetworkTarget[]
}

export interface Job {
  id: string
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

export interface Application {
  id: string
  job_id: string
  stage: 'Research' | 'Shortlist' | 'Applied' | 'Interview' | 'Offer' | 'Rejected'
  notes: string
  applied_at: string | null
  updated_at: string
}

export interface Resume {
  id: string
  file_name: string
  text_content: string
  ats_score: number
  best_fit: string
  found_keywords: string[]
  missing_keywords: string[]
  skills: Array<{ name: string; current: number; target: number }>
  ats_breakdown: Array<{ label: string; score: number; note: string }>
  analysed_at: string
  version: number
  is_active: boolean
  parent_id: string | null
  tags: string[]
}

export interface NetworkTarget {
  id: string
  label: string
  target_count: number
  sent_count: number
  reply_count: number
}

function load(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaults()
    const parsed = JSON.parse(raw)
    return { ...getDefaults(), ...parsed }
  } catch {
    return getDefaults()
  }
}

function save(data: StoredData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getDefaults(): StoredData {
  return {
    jobs: [],
    applications: [],
    resumes: [],
    networkTargets: [
      { id: 'nt-1', label: 'Design recruiters', target_count: 20, sent_count: 0, reply_count: 0 },
      { id: 'nt-2', label: 'Hiring managers', target_count: 12, sent_count: 0, reply_count: 0 },
      { id: 'nt-3', label: 'Alumni / warm contacts', target_count: 10, sent_count: 0, reply_count: 0 },
    ],
  }
}

export const store = {
  load,
  save,

  getJobs: () => load().jobs,
  addJob: (job: Omit<Job, 'id' | 'imported_at'>) => {
    const data = load()
    const newJob = { ...job, id: `job-${Date.now()}`, imported_at: new Date().toISOString() }
    data.jobs.push(newJob)
    save(data)
    return newJob
  },
  updateJob: (id: string, updates: Partial<Job>) => {
    const data = load()
    const index = data.jobs.findIndex(j => j.id === id)
    if (index >= 0) {
      data.jobs[index] = { ...data.jobs[index], ...updates }
      save(data)
    }
  },
  deleteJob: (id: string) => {
    const data = load()
    data.jobs = data.jobs.filter(j => j.id !== id)
    data.applications = data.applications.filter(a => a.job_id !== id)
    save(data)
  },

  getApplications: () => load().applications,
  addApplication: (jobId: string, stage: Application['stage'] = 'Research') => {
    const data = load()
    const exists = data.applications.find(a => a.job_id === jobId)
    if (exists) return exists
    const newApp = {
      id: `app-${Date.now()}`,
      job_id: jobId,
      stage,
      notes: '',
      applied_at: stage === 'Applied' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    data.applications.push(newApp)
    save(data)
    return newApp
  },
  updateStage: (id: string, stage: Application['stage']) => {
    const data = load()
    const app = data.applications.find(a => a.id === id)
    if (app) {
      app.stage = stage
      app.updated_at = new Date().toISOString()
      if (stage === 'Applied' && !app.applied_at) app.applied_at = new Date().toISOString()
      save(data)
    }
  },
  deleteApplication: (id: string) => {
    const data = load()
    data.applications = data.applications.filter(a => a.id !== id)
    save(data)
  },

  getResumes: () => load().resumes,
  getActiveResumes: () => load().resumes.filter(r => r.is_active),
  getLatestResume: () => {
    const resumes = load().resumes
    const active = resumes.find(r => r.is_active)
    return active || (resumes.length > 0 ? resumes[resumes.length - 1] : null)
  },
  saveResume: (resume: Omit<Resume, 'id'>) => {
    const data = load()
    const newResume = { 
      ...resume, 
      id: `resume-${Date.now()}`,
      version: 1,
      is_active: true,
      parent_id: null,
      tags: []
    }
    data.resumes.push(newResume)
    save(data)
    return newResume
  },
  createResumeVersion: (resumeId: string) => {
    const data = load()
    const current = data.resumes.find(r => r.id === resumeId)
    if (!current) return null
    // Deactivate current version
    current.is_active = false
    // Create new version
    const newResume = {
      ...current,
      id: `resume-${Date.now()}`,
      version: current.version + 1,
      is_active: true,
      parent_id: current.id,
      // Reset analysis fields for new version? Keep them for now, user can reanalyse.
    }
    data.resumes.push(newResume)
    save(data)
    return newResume
  },
  setActiveResume: (resumeId: string) => {
    const data = load()
    // Deactivate all
    data.resumes.forEach(r => { r.is_active = false; })
    // Activate the chosen one
    const resume = data.resumes.find(r => r.id === resumeId)
    if (resume) {
      resume.is_active = true
      save(data)
      return resume
    }
    return null
  },
  deleteResume: (id: string) => {
    const data = load()
    data.resumes = data.resumes.filter(r => r.id !== id)
    save(data)
  },

  getNetworkTargets: () => load().networkTargets,
  logSent: (id: string) => {
    const data = load()
    const target = data.networkTargets.find(t => t.id === id)
    if (target) {
      target.sent_count++
      save(data)
    }
  },
  logReply: (id: string) => {
    const data = load()
    const target = data.networkTargets.find(t => t.id === id)
    if (target) {
      target.reply_count++
      save(data)
    }
  },

  reset: () => {
    localStorage.removeItem(STORAGE_KEY)
  },
}
