import { useState, useEffect } from 'react'
import { useJobs, useApplications, useNetworkTargets } from '../hooks/useData'
import JobsView from '../components/JobsView'
import ResumeView from '../components/ResumeView'
import ResumeImprovementView from '../components/ResumeImprovementView'
import PipelineView from '../components/PipelineView'
import NetworkView from '../components/NetworkView'
import GrowthView from '../components/GrowthView'
import Settings from '../components/Settings'
import Onboarding from '../components/Onboarding'
import { getApiKeyStatus } from '../lib/api'
import { getNotionConfig, syncJobsToNotion, updateNotionApplication } from '../lib/notion'

import Logo from '../components/Logo'

const TABS = [
  { key: 'jobs', label: 'Jobs' },
  { key: 'resume', label: 'Resume Match' },
  { key: 'improve', label: 'Improve' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'network', label: 'Network' },
  { key: 'growth', label: 'Growth' },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('jobs')
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [notionSyncing, setNotionSyncing] = useState(false)
  const [notionStatus, setNotionStatus] = useState<{ synced: number; failed: number } | null>(null)
  const { jobs, addJob, deleteJob, refresh: refreshJobs } = useJobs()
  const { applications, addApplication, updateStage, deleteApplication } = useApplications()
  const { targets, logSent, logReply } = useNetworkTargets()
  const apiStatus = getApiKeyStatus()
  const activeApis = Object.values(apiStatus).filter(Boolean).length
  const notionConfig = getNotionConfig()

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed')
    if (!completed) {
      setShowOnboarding(true)
    }
  }, [])

  async function handleNotionSync() {
    if (!notionConfig.enabled || !notionConfig.apiKey || !notionConfig.databaseId) return

    setNotionSyncing(true)
    setNotionStatus(null)

    try {
      const result = await syncJobsToNotion(notionConfig.apiKey, notionConfig.databaseId, jobs)
      setNotionStatus(result)
      setTimeout(() => setNotionStatus(null), 5000)
    } catch (err) {
      console.error('Notion sync error:', err)
    } finally {
      setNotionSyncing(false)
    }
  }

  return (
    <>
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <div className="app-layout">
      <header>
        <div className="logo">
          <Logo size={34} />
          <span>Meeseeker</span>
          <small>Job Tracker</small>
        </div>
        <div className="header-actions">
          <span className="badge"><strong>{jobs.length}</strong> tracked</span>
          <span className="badge"><strong>{applications.length}</strong> applied</span>
          <span className="badge">{activeApis}/3 APIs</span>
          {notionConfig.enabled && (
            <button
              className="btn btn-outline btn-sm"
              onClick={handleNotionSync}
              disabled={notionSyncing || jobs.length === 0}
              style={{ borderColor: 'var(--blue)', color: notionSyncing ? 'var(--text-2)' : 'var(--blue)' }}
              title="Sync to Notion"
            >
              {notionSyncing ? (
                <><span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }}></span> Syncing...</>
              ) : notionStatus ? (
                <>{notionStatus.synced} synced</>
              ) : (
                <>Notion &#8644;</>
              )}
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => setShowSettings(true)}>
            &#9881; Settings
          </button>
        </div>
      </header>

      <nav className="nav-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="container">
        {activeTab === 'jobs' && (
          <JobsView jobs={jobs} applications={applications} onAddApplication={addApplication} onDeleteJob={deleteJob} onJobImported={refreshJobs} />
        )}
        {activeTab === 'resume' && (
          <ResumeView />
        )}
        {activeTab === 'improve' && (
          <ResumeImprovementView />
        )}
        {activeTab === 'pipeline' && (
          <PipelineView applications={applications} jobs={jobs} onAddApplication={addApplication} onUpdateStage={updateStage} onDeleteApplication={deleteApplication} />
        )}
        {activeTab === 'network' && (
          <NetworkView targets={targets} onLogSent={logSent} onLogReply={logReply} />
        )}
        {activeTab === 'growth' && (
          <GrowthView />
        )}
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} onNotionSync={handleNotionSync} />}
      </div>
    </>
  )
}
