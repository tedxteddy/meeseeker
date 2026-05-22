import { useState, useEffect } from 'react'
import { store } from '../lib/store'
import type { Job, Application, Resume, NetworkTarget } from '../lib/store'

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    setJobs(store.getJobs())
  }, [])

  function refresh() {
    setJobs(store.getJobs())
  }

  function addJob(job: Omit<Job, 'id' | 'imported_at'>) {
    const newJob = store.addJob(job)
    refresh()
    return newJob
  }

  function deleteJob(id: string) {
    store.deleteJob(id)
    refresh()
  }

  return { jobs, addJob, deleteJob, refresh }
}

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([])

  useEffect(() => {
    setApplications(store.getApplications())
  }, [])

  function refresh() {
    setApplications(store.getApplications())
  }

  function addApplication(jobId: string, stage: string = 'Research') {
    store.addApplication(jobId, stage as Application['stage'])
    refresh()
  }

  function updateStage(id: string, stage: string) {
    store.updateStage(id, stage as Application['stage'])
    refresh()
  }

  function deleteApplication(id: string) {
    store.deleteApplication(id)
    refresh()
  }

  return { applications, addApplication, updateStage, deleteApplication, refresh }
}

export function useResumes() {
  const [latest, setLatest] = useState<Resume | null>(null)
  const [allResumes, setAllResumes] = useState<Resume[]>([])

  useEffect(() => {
    setLatest(store.getLatestResume())
    setAllResumes(store.getResumes())
  }, [])

  function refresh() {
    setLatest(store.getLatestResume())
    setAllResumes(store.getResumes())
  }

  function saveResume(resume: Omit<Resume, 'id'>) {
    const saved = store.saveResume(resume)
    refresh()
    return saved
  }
  
  function createResumeVersion(resumeId: string) {
    const versioned = store.createResumeVersion(resumeId)
    refresh()
    return versioned
  }
  
  function setActiveResume(resumeId: string) {
    const activated = store.setActiveResume(resumeId)
    refresh()
    return activated
  }
  
  function deleteResume(resumeId: string) {
    store.deleteResume(resumeId)
    refresh()
  }

  return { 
    latest, 
    allResumes,
    activeResumes: allResumes.filter(r => r.is_active),
    saveResume,
    createResumeVersion,
    setActiveResume,
    deleteResume,
    refresh 
  }
}

export function useNetworkTargets() {
  const [targets, setTargets] = useState<NetworkTarget[]>([])

  useEffect(() => {
    setTargets(store.getNetworkTargets())
  }, [])

  function refresh() {
    setTargets(store.getNetworkTargets())
  }

  function logSent(id: string) {
    store.logSent(id)
    refresh()
  }

  function logReply(id: string) {
    store.logReply(id)
    refresh()
  }

  return { targets, logSent, logReply, refresh }
}
