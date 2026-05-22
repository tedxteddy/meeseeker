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
  const { jobs, addJob, deleteJob, refresh: refreshJobs } = useJobs()
  const { applications, addApplication, updateStage, deleteApplication } = useApplications()
  const { targets, logSent, logReply } = useNetworkTargets()
  const apiStatus = getApiKeyStatus()
  const activeApis = Object.values(apiStatus).filter(Boolean).length

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed')
    if (!completed) {
      setShowOnboarding(true)
    }
  }, [])

  return (
    <>
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <div className="app-layout">
      <header>
        <div className="logo">
          <div className="logo-icon">YC</div>
          <span>YC Job Board</span>
          <small>Remote Worldwide</small>
        </div>
        <div className="header-actions">
          <span className="badge"><strong>{jobs.length}</strong> tracked</span>
          <span className="badge"><strong>{applications.length}</strong> applied</span>
          <span className="badge">{activeApis}/3 APIs</span>
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

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
