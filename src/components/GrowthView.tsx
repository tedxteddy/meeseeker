const ROADMAP = [
  { phase: 'Days 1-15', focus: 'ATS and portfolio base', color: 'var(--accent)', actions: ['Rewrite resume bullets', 'Publish portfolio homepage', 'Create 3 role-specific resume versions'] },
  { phase: 'Days 16-35', focus: 'UI/UX proof', color: 'var(--green)', actions: ['Build one mobile app redesign', 'Document user flow and wireframes', 'Add accessibility checklist'] },
  { phase: 'Days 36-60', focus: 'Market execution', color: 'var(--blue)', actions: ['Apply to 40 roles', 'Send 80 outreach notes', 'Track source, response, and interview rates'] },
  { phase: 'Days 61-90', focus: 'Conversion', color: 'var(--orange)', actions: ['Mock interviews twice weekly', 'Build one motion reel', 'Negotiate stipend or junior salary'] },
]

const PROJECTS = [
  { title: 'Startup brand launch kit', value: 'Shows brand identity, social media, and ad assets in one system.', output: 'Logo, type/color guide, 8 social posts, launch banner, motion teaser.' },
  { title: 'Mobile app UX redesign', value: 'Closes the UI/UX evidence gap for Figma-heavy roles.', output: 'Problem statement, user flow, wireframes, prototype, final screens.' },
  { title: 'Cafe rebrand case study', value: 'Turns an existing project into a hiring-grade story.', output: 'Before/after, audience, rationale, mockups, launch plan.' },
]

export default function GrowthView() {
  return (
    <>
      <h3 style={{ fontSize: 14, marginBottom: 12 }}>90-Day Roadmap</h3>
      <div className="roadmap-grid">
        {ROADMAP.map((step, i) => (
          <div key={i} className="roadmap-card" style={{ borderTopColor: step.color }}>
            <span className="phase">{step.phase}</span>
            <h4>{step.focus}</h4>
            <ul>
              {step.actions.map((action, j) => <li key={j}>{action}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14, marginBottom: 12, marginTop: 24 }}>Portfolio Projects</h3>
      <div className="roadmap-grid">
        {PROJECTS.map((project, i) => (
          <div key={i} className="roadmap-card">
            <h4>{project.title}</h4>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{project.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-2)' }}><strong>Output:</strong> {project.output}</p>
          </div>
        ))}
      </div>
    </>
  )
}
