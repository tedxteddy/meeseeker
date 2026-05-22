import { useState } from 'react'

const STAGES = ['Research', 'Shortlist', 'Applied', 'Interview', 'Offer', 'Rejected'] as const

interface PipelineViewProps {
  applications: Array<{ id: string; job_id: string; stage: string; updated_at: string }>
  jobs: Array<{ id: string; role: string; company: string }>
  onAddApplication: (jobId: string, stage?: string) => void
  onUpdateStage: (id: string, stage: string) => void
  onDeleteApplication: (id: string) => void
}

export default function PipelineView({ applications, jobs, onAddApplication, onUpdateStage, onDeleteApplication }: PipelineViewProps) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || '')
  const [selectedStage, setSelectedStage] = useState('Research')

  function getJob(jobId: string) {
    return jobs.find(j => j.id === jobId)
  }

  return (
    <>
      <div className="controls">
        <select
          className="filter-select"
          value={selectedJobId}
          onChange={e => setSelectedJobId(e.target.value)}
          style={{ flex: 1 }}
        >
          {jobs.length === 0 && <option value="">No jobs tracked</option>}
          {jobs.map(job => (
            <option key={job.id} value={job.id}>{job.company} — {job.role}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={selectedStage}
          onChange={e => setSelectedStage(e.target.value)}
        >
          {STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
        </select>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onAddApplication(selectedJobId, selectedStage)}
          disabled={!selectedJobId}
        >
          Add to Pipeline
        </button>
      </div>

      <div className="stats-bar">
        <span><strong>{applications.length}</strong> total applications</span>
        {STAGES.map(stage => {
          const count = applications.filter(a => a.stage === stage).length
          return count > 0 ? <span key={stage} className="stat-chip">{stage} <strong>{count}</strong></span> : null
        })}
      </div>

      <div className="kanban">
        {STAGES.map(stage => {
          const items = applications.filter(app => app.stage === stage)
          return (
            <div key={stage} className="kanban-lane">
              <h4>{stage} ({items.length})</h4>
              {items.length === 0 ? (
                <p style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'center', padding: '20px 0' }}>Empty</p>
              ) : (
                items.map(app => {
                  const job = getJob(app.job_id)
                  return (
                    <div key={app.id} className="kanban-card">
                      <strong>{job?.company || 'Unknown'}</strong>
                      <span className="muted">{job?.role}</span>
                      <div style={{ marginTop: 6 }}>
                        <select
                          value={app.stage}
                          onChange={e => onUpdateStage(app.id, e.target.value)}
                          style={{ width: '100%', fontSize: 10 }}
                        >
                          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => onDeleteApplication(app.id)}>Remove</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Interview Prep</h3>
        <div className="roadmap-grid">
          <div className="roadmap-card">
            <h4>Graphic Design</h4>
            <ul>
              <li>Walk through a campaign asset you created</li>
              <li>How do you handle feedback?</li>
              <li>How do you maintain brand consistency?</li>
            </ul>
          </div>
          <div className="roadmap-card">
            <h4>Brand Designer</h4>
            <ul>
              <li>Explain your rebrand choices</li>
              <li>How do typography and color support audience fit?</li>
              <li>What would you include in a brand guide?</li>
            </ul>
          </div>
          <div className="roadmap-card">
            <h4>UI/UX</h4>
            <ul>
              <li>Show a user flow in Figma</li>
              <li>How would you test a prototype?</li>
              <li>What accessibility checks do you run?</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
