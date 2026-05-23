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
import { getApiKeyStatus, type AutoSearchResult } from '../lib/api'
import { getNotionConfig, syncJobsToNotion, updateNotionApplication } from '../lib/notion'

import Logo from '../components/Logo'

function QRModal({ onClose, url }: { onClose: () => void; url: string }) {
  const [localIp, setLocalIp] = useState('')
  useEffect(() => {
    fetch('/api/network-ip').then(r => r.json()).then(d => {
      const isLocalhost = d.ip === '127.0.0.1' || d.ip === '::1' || d.ip === 'localhost'
      setLocalIp(isLocalhost ? window.location.hostname : d.ip)
    }).catch(() => setLocalIp(window.location.hostname))
  }, [])
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 28, maxWidth: 340, width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Open on Mobile</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        </div>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`}
          alt="QR Code"
          style={{ borderRadius: 0, margin: '0 auto 12px', display: 'block', border: '1px solid var(--border)' }}
        />
        <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>Scan with your phone camera</p>
        {localIp && (
          <p style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'monospace', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 0 }}>
            {url}
          </p>
        )}
        <p style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 12 }}>
          Make sure your phone is on the same Wi-Fi network
        </p>
        <button className="btn btn-primary btn-sm" onClick={onClose} style={{ marginTop: 16, width: '100%' }}>
          Done
        </button>
      </div>
    </div>
  )
}

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
  const [showQRModal, setShowQRModal] = useState(false)
  const [notionStatus, setNotionStatus] = useState<{ synced: number; failed: number } | null>(null)
  const [autoSearchResults, setAutoSearchResults] = useState<AutoSearchResult | null>(null)
  const { jobs, addJob, deleteJob, refresh: refreshJobs } = useJobs()
  const { applications, addApplication, updateStage, deleteApplication } = useApplications()
  const { targets, logSent, logReply } = useNetworkTargets()
  const apiStatus = getApiKeyStatus()
  const totalApis = Object.keys(apiStatus).length
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
          <span className="badge">{activeApis}/{totalApis} APIs</span>
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
          <button className="btn btn-outline btn-sm" onClick={() => setShowQRModal(true)} style={{ fontSize: 16, padding: '6px 10px' }} title="Open on Mobile">
            &#9743; QR
          </button>
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
          <JobsView
            jobs={jobs}
            applications={applications}
            onAddApplication={addApplication}
            onDeleteJob={deleteJob}
            onJobImported={refreshJobs}
            initialSearchResults={autoSearchResults}
            onClearAutoResults={() => setAutoSearchResults(null)}
          />
        )}
        {activeTab === 'resume' && (
          <ResumeView onAutoSearch={(results) => { setAutoSearchResults(results); setActiveTab('jobs') }} />
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

      <button className="floating-add-btn" onClick={() => setActiveTab('resume')} title="Add Resume">
          +
        </button>

        {showQRModal && <QRModal onClose={() => setShowQRModal(false)} url={window.location.origin} />}
        {showSettings && <Settings onClose={() => setShowSettings(false)} onNotionSync={handleNotionSync} />}
      </div>
    </>
  )
}
