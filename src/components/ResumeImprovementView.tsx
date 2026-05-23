import { useState, useMemo } from 'react'
import { useResumes, useJobs } from '../hooks/useData'

const SKILL_LEARNING_RESOURCES: Record<string, Array<{ title: string; url: string; type: string; duration: string }>> = {
  'Figma': [
    { title: 'Figma 101 - Beginner Tutorial', url: 'https://www.figma.com/resources/learn-design/', type: 'Course', duration: '2h' },
    { title: 'Figma Advanced Components', url: 'https://www.youtube.com/playlist?list=PLXDU_eVOJTx7Q3Sh-2RggLpD2s4GDSB1t', type: 'Video Series', duration: '4h' },
  ],
  'UI Design': [
    { title: 'Google UX Design Certificate', url: 'https://www.coursera.org/professional-certificates/google-ux-design', type: 'Certificate', duration: '6 months' },
    { title: 'Refactoring UI', url: 'https://www.refactoringui.com/', type: 'Book', duration: '3h' },
  ],
  'UX Design': [
    { title: 'Interaction Design Foundation Courses', url: 'https://www.interaction-design.org/courses', type: 'Course', duration: '40h' },
    { title: 'NN Group UX Articles', url: 'https://www.nngroup.com/articles/', type: 'Articles', duration: '10h' },
  ],
  'Typography': [
    { title: 'Practical Typography', url: 'https://practicaltypography.com/', type: 'Guide', duration: '2h' },
    { title: 'Google Fonts Knowledge', url: 'https://fonts.google.com/knowledge', type: 'Resource', duration: '1h' },
  ],
  'Design Systems': [
    { title: 'Design Systems by Figma', url: 'https://www.designsystems.com/', type: 'Guide', duration: '3h' },
    { title: 'Atomic Design by Brad Frost', url: 'https://atomicdesign.bradfrost.com/', type: 'Book', duration: '4h' },
  ],
  'Prototyping': [
    { title: 'Prototyping with Figma', url: 'https://help.figma.com/hc/en-us/categories/360002042553-Prototyping', type: 'Tutorial', duration: '2h' },
    { title: 'Principle for Mac Prototyping', url: 'https://principleformac.com/tutorials.html', type: 'Tutorial', duration: '3h' },
  ],
  'Accessibility': [
    { title: 'WebAIM WCAG Checklist', url: 'https://webaim.org/standards/wcag/checklist', type: 'Checklist', duration: '1h' },
    { title: 'a11y Project', url: 'https://www.a11yproject.com/', type: 'Resource', duration: '2h' },
  ],
  'HTML': [
    { title: 'FreeCodeCamp HTML Course', url: 'https://www.freecodecamp.org/learn/responsive-web-design/', type: 'Course', duration: '10h' },
    { title: 'MDN HTML Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML', type: 'Documentation', duration: '5h' },
  ],
  'CSS': [
    { title: 'CSS Tricks Complete Guide', url: 'https://css-tricks.com/guides/', type: 'Guide', duration: '8h' },
    { title: 'Flexbox Froggy Game', url: 'https://flexboxfroggy.com/', type: 'Game', duration: '1h' },
  ],
  'Adobe Creative Suite': [
    { title: 'Adobe Learn - Official Tutorials', url: 'https://helpx.adobe.com/learn.html', type: 'Course', duration: '20h' },
  ],
  'Brand Identity': [
    { title: 'Brand Identity Guide by Canva', url: 'https://www.canva.com/learn/brand-identity/', type: 'Article', duration: '1h' },
  ],
  'Motion Design': [
    { title: 'Motion Design Course by School of Motion', url: 'https://www.schoolofmotion.com/', type: 'Course', duration: '12 weeks' },
  ],
  '3D Modeling': [
    { title: 'Blender Guru Beginner Tutorials', url: 'https://www.youtube.com/playlist?list=PLjEaoINr3zgFX8ZsChQVQaGAUURm2E9W2', type: 'Video Series', duration: '15h' },
  ],
  'Design Thinking': [
    { title: 'IDEO U Design Thinking Course', url: 'https://www.ideou.com/collections/design-thinking', type: 'Course', duration: '8h' },
  ],
  'Responsive Design': [
    { title: 'FreeCodeCamp Responsive Web Design', url: 'https://www.freecodecamp.org/learn/responsive-web-design/', type: 'Course', duration: '20h' },
  ],
}

const COMMON_BUZZWORDS_BY_ROLE: Record<string, string[]> = {
  'UI/UX Designer': [
    'User-centered design', 'Interaction design', 'Usability testing', 'Wireframing', 'User flow',
    'Information architecture', 'Design thinking', 'Accessibility (WCAG)', 'Design system', 'Component library',
    'A/B testing', 'User research', 'Persona', 'Journey mapping', 'Heuristic evaluation',
  ],
  'Graphic Designer': [
    'Visual identity', 'Brand guidelines', 'Print production', 'Color management', 'Vector illustration',
    'Photo retouching', 'Layout design', 'Packaging design', 'Editorial design', 'Typography hierarchy',
  ],
  'Product Designer': [
    'Product strategy', 'Design sprints', 'Cross-functional collaboration', 'Metrics-driven design',
    'Design ops', 'Rapid prototyping', 'Lean UX', 'Design critique', 'Handoff', 'Developer collaboration',
  ],
  'Frontend Developer': [
    'React', 'TypeScript', 'CSS-in-JS', 'Styled Components', 'Tailwind CSS',
    'Responsive design', 'Web performance', 'SEO', 'Cross-browser compatibility', 'Git',
    'CI/CD', 'Testing', 'Storybook', 'Webpack/Vite', 'REST APIs',
  ],
}

const INDUSTRY_AVERAGES = {
  'UI/UX Designer': { atsTarget: 75, avgSalaryEstimate: '$85k-$120k' },
  'Graphic Designer': { atsTarget: 70, avgSalaryEstimate: '$50k-$75k' },
  'Product Designer': { atsTarget: 80, avgSalaryEstimate: '$100k-$145k' },
  'Frontend Developer': { atsTarget: 78, avgSalaryEstimate: '$90k-$130k' },
}

interface SkillGap {
  skill: string
  currentLevel: number
  targetLevel: number
  resources: Array<{ title: string; url: string; type: string; duration: string }>
}

export default function ResumeImprovementView() {
  const { latest: latestResume, allResumes, setActiveResume } = useResumes()
  const { jobs } = useJobs()

  const [selectedRole, setSelectedRole] = useState<string>('UI/UX Designer')
  const [showResources, setShowResources] = useState<Record<string, boolean>>({})
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportTemplate, setExportTemplate] = useState<'ats' | 'modern' | 'minimal'>('ats')

  const resumeSkills = useMemo(() => {
    if (!latestResume?.skills) return []
    return latestResume.skills.map(s => s.name)
  }, [latestResume])

  const skillGaps = useMemo<SkillGap[]>(() => {
    if (!latestResume?.skills) return []

    const targetSkills = getTargetSkillsForRole(selectedRole)
    const currentSkills = latestResume.skills

    const gaps: SkillGap[] = []
    for (const target of targetSkills) {
      const existing = currentSkills.find(s => s.name.toLowerCase() === target.toLowerCase())
      const currentLevel = existing?.current ?? 20
      const targetLevel = existing?.target ?? 75

      gaps.push({
        skill: target,
        currentLevel,
        targetLevel,
        resources: SKILL_LEARNING_RESOURCES[target] || [
          { title: `Learn ${target}`, url: `https://www.google.com/search?q=learn+${encodeURIComponent(target)}+online`, type: 'Search', duration: 'Varies' }
        ],
      })
    }
    return gaps
  }, [latestResume, selectedRole])

  const buzzwords = useMemo(() => {
    return COMMON_BUZZWORDS_BY_ROLE[selectedRole] || []
  }, [selectedRole])

  const buzzwordMatch = useMemo(() => {
    if (!latestResume?.text_content) return buzzwords.map(b => ({ word: b, found: false }))
    const text = latestResume.text_content.toLowerCase()
    return buzzwords.map(b => ({
      word: b,
      found: text.includes(b.toLowerCase()),
    }))
  }, [latestResume, buzzwords])

  const foundBuzzwords = buzzwordMatch.filter(b => b.found).length
  const totalBuzzwords = buzzwordMatch.length

  function getTargetSkillsForRole(role: string): string[] {
    const roleSkills: Record<string, string[]> = {
      'UI/UX Designer': ['Figma', 'UI Design', 'UX Design', 'Prototyping', 'Typography', 'Design Systems', 'Accessibility', 'User Research', 'Wireframing', 'Interaction Design'],
      'Graphic Designer': ['Adobe Creative Suite', 'Typography', 'Brand Identity', 'Layout Design', 'Color Theory', 'Print Design', 'Logo Design', 'Illustration'],
      'Product Designer': ['Figma', 'UI Design', 'UX Design', 'Product Strategy', 'Design Systems', 'Prototyping', 'User Research', 'Design Thinking', 'Cross-functional Collaboration'],
      'Frontend Developer': ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Responsive Design', 'Git', 'Web Performance', 'Testing', 'REST APIs'],
    }
    return roleSkills[role] || roleSkills['UI/UX Designer']
  }

  function toggleResources(skill: string) {
    setShowResources(prev => ({ ...prev, [skill]: !prev[skill] }))
  }

  function generateATSResume() {
    if (!latestResume) return ''

    const text = latestResume.text_content
    const score = latestResume.ats_score

    let resume = ''

    if (exportTemplate === 'ats') {
      resume = `=== RESUME (ATS-OPTIMIZED) ===

${text}

---
ATS Score: ${score}/100
Suggested Improvements:
${skillGaps.filter(g => g.currentLevel < g.targetLevel).map(g =>
  `- Improve ${g.skill}: current ${g.currentLevel}%, target ${g.targetLevel}%`
).join('\n')}

Missing Keywords:
${buzzwordMatch.filter(b => !b.found).map(b => `- ${b.word}`).join('\n')}
---`
    } else if (exportTemplate === 'modern') {
      resume = text
    } else {
      resume = text
    }

    return resume
  }

  function downloadResume() {
    const content = generateATSResume()
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportTemplate === 'ats' ? 'ats-optimized-resume.txt' : 'resume.txt'
    a.click()
    requestAnimationFrame(() => URL.revokeObjectURL(url))
    setShowExportModal(false)
  }

  const roleOptions = Object.keys(COMMON_BUZZWORDS_BY_ROLE)

  const industryAvg = INDUSTRY_AVERAGES[selectedRole as keyof typeof INDUSTRY_AVERAGES] || INDUSTRY_AVERAGES['UI/UX Designer']
  const atsTarget = industryAvg.atsTarget

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 14, margin: 0 }}>Resume Improvement</h2>
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 0,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13,
            }}
          >
            {roleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => setShowExportModal(true)} disabled={!latestResume}>
            &#128196; Export Resume
          </button>
        </div>
      </div>

      {!latestResume && (
        <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="icon" style={{ fontSize: 48, marginBottom: 16 }}>&#128200;</div>
          <h3 style={{ marginBottom: 12 }}>No resume to improve</h3>
          <p style={{ color: 'var(--text-2)', marginBottom: 24, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            First analyse your resume in the <strong>Resume Match</strong> tab, then come here to get skill gap analysis, keyword optimization, and improvement suggestions.
          </p>
          <button className="btn btn-primary" onClick={() => { (document.querySelector('.nav-tab') as HTMLButtonElement)?.click() }}>
            Go to Resume Match
          </button>
        </div>
      )}

      {latestResume && (
        <>
          {/* Score Overview */}
          <div className="stats-bar" style={{ marginBottom: 16 }}>
            <span>Current ATS: <strong style={{ color: latestResume.ats_score >= atsTarget ? 'var(--green)' : 'var(--orange)' }}>{latestResume.ats_score}/100</strong></span>
            <span>Target: <strong style={{ color: 'var(--blue)' }}>{atsTarget}/100</strong></span>
            <span>Gap: <strong style={{ color: latestResume.ats_score >= atsTarget ? 'var(--green)' : 'var(--red)' }}>
              {latestResume.ats_score >= atsTarget ? 'On track' : `${atsTarget - latestResume.ats_score} points needed`}
            </strong></span>
            <span>Est. Salary: <strong>{INDUSTRY_AVERAGES[selectedRole as keyof typeof INDUSTRY_AVERAGES]?.avgSalaryEstimate || '$85k-$120k'}</strong></span>
          </div>

          {/* Skill Gap Analysis */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>
              Skill Gap Analysis for {selectedRole}
            </h3>
            {skillGaps.map((gap, i) => {
              const gapSize = gap.targetLevel - gap.currentLevel
              const isSignificant = gapSize > 30
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13 }}>{gap.skill}</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {gap.currentLevel}% → {gap.targetLevel}%
                      {gapSize > 0 && <span style={{ color: isSignificant ? 'var(--red)' : 'var(--orange)', marginLeft: 4 }}>
                        ({gapSize > 0 ? '+' : ''}{gapSize})
                      </span>}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ height: '100%', width: `${gap.targetLevel > 0 ? (gap.currentLevel / gap.targetLevel) * 100 : gap.currentLevel > 0 ? 100 : 0}%`, background: gapSize > 30 ? 'var(--red)' : gapSize > 10 ? 'var(--orange)' : 'var(--green)', borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                  {isSignificant && (
                    <button className="btn btn-link btn-xs" onClick={() => toggleResources(gap.skill)} style={{ fontSize: 11, color: 'var(--blue)', padding: 0 }}>
                      {showResources[gap.skill] ? 'Hide resources' : `Show learning resources (${gap.resources.length})`}
                    </button>
                  )}
                  {showResources[gap.skill] && (
                    <div style={{ marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.05)', borderRadius: 8 }}>
                      {gap.resources.map((res, ri) => (
                        <a key={ri} href={res.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: ri < gap.resources.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, color: 'var(--blue)', textDecoration: 'none' }}>
                          <span>{res.title}</span>
                          <span style={{ color: 'var(--text-2)', fontSize: 11 }}>{res.type} · {res.duration}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Portfolio & LinkedIn Detection */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>Portfolio & Profiles</h3>
            {(() => {
              const text = latestResume.text_content || ''
              const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|io|dev|app|me|design)\/[^\s]*)/gi
              const urls = [...text.matchAll(urlRegex)].map(m => m[0].replace(/[.,;:!?]$/, ''))
              const uniqueUrls = [...new Set(urls)]

              const categories = {
                linkedin: uniqueUrls.filter(u => u.includes('linkedin.com')),
                github: uniqueUrls.filter(u => u.includes('github.com')),
                portfolio: uniqueUrls.filter(u => u.includes('portfolio') || u.includes('portflio') || u.match(/(behance|dribbble|figma|notion|wix|squarespace)\./i)),
                other: uniqueUrls.filter(u =>
                  !u.includes('linkedin.com') &&
                  !u.includes('github.com') &&
                  !(u.includes('portfolio') || u.includes('portflio') || u.match(/(behance|dribbble|figma|notion|wix|squarespace)\./i))
                ),
              }

              const hasLinkedIn = categories.linkedin.length > 0
              const hasGithub = categories.github.length > 0
              const hasPortfolio = categories.portfolio.length > 0
              const score = [hasLinkedIn, hasGithub, hasPortfolio].filter(Boolean).length
              const total = 3

              return (
                <>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,0.03)', borderRadius: 8, flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{hasLinkedIn ? '✅' : '❌'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>LinkedIn</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,0.03)', borderRadius: 8, flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{hasPortfolio ? '✅' : '❌'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Portfolio</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, background: 'rgba(0,0,0,0.03)', borderRadius: 8, flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{hasGithub ? '✅' : '❌'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>GitHub</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                    Profile completeness: {score}/{total}
                    {score < total && <span style={{ color: 'var(--orange)', marginLeft: 4 }}>
                      — Add {!hasLinkedIn ? 'LinkedIn' : !hasPortfolio ? 'portfolio' : 'GitHub'} to boost credibility
                    </span>}
                  </span>
                  {uniqueUrls.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>Found URLs:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {uniqueUrls.map((url, i) => (
                          <a key={i} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'rgba(0,0,0,0.05)',
                              fontSize: 11,
                              color: 'var(--blue)',
                              textDecoration: 'none',
                              wordBreak: 'break-all',
                            }}>
                            {url.length > 40 ? url.slice(0, 40) + '...' : url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {uniqueUrls.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--text-2)', fontStyle: 'italic' }}>
                      No URLs detected in your resume. Consider adding LinkedIn, portfolio, and GitHub links.
                    </p>
                  )}
                </>
              )
            })()}
          </div>

          {/* Keyword Optimization */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, margin: 0 }}>
                Keyword Optimization
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {foundBuzzwords}/{totalBuzzwords} found
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>
              Industry-specific keywords for <strong>{selectedRole}</strong> roles. Adding these improves your ATS match rate.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {buzzwordMatch.map((b, i) => (
                <span key={i} className={`skill-tag ${b.found ? 'matched' : ''}`}
                  style={b.found ? {} : {
                    borderColor: 'var(--border)',
                    color: 'var(--text-2)',
                    opacity: 0.7,
                    cursor: 'pointer',
                  }}
                >
                  {b.word}
                  {b.found ? ' ✓' : ' +'}
                </span>
              ))}
            </div>
          </div>

          {/* Resume Versioning */}
          {allResumes.length > 1 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Resume Versions ({allResumes.length})</h3>
              {allResumes.map((resume, i) => (
                <div key={resume.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < allResumes.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                  <div>
                    <strong>v{resume.version}</strong>
                    <span style={{ color: 'var(--text-2)', marginLeft: 8 }}>{resume.file_name}</span>
                    {resume.is_active && <span className="badge" style={{ marginLeft: 8 }}>Active</span>}
                    {resume.tags && resume.tags.length > 0 && resume.tags.map((tag, ti) => (
                      <span key={ti} className="skill-tag" style={{ fontSize: 10, marginLeft: 4 }}>{tag}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-outline btn-xs" onClick={() => setActiveResume(resume.id)}>
                      &#10003; Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Export Modal */}
      {showExportModal && latestResume && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, margin: 0 }}>Export Resume</h2>
              <button className="btn btn-link" onClick={() => setShowExportModal(false)}>&#215;</button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 13, marginBottom: 8 }}>Choose Template</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, border: exportTemplate === 'ats' ? '2px solid var(--blue)' : '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="template" checked={exportTemplate === 'ats'} onChange={() => setExportTemplate('ats')} />
                  <div>
                    <strong>ATS-Optimized Resume</strong>
                    <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0 }}>Clean formatting with keyword optimization suggestions</p>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, border: exportTemplate === 'modern' ? '2px solid var(--blue)' : '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="template" checked={exportTemplate === 'modern'} onChange={() => setExportTemplate('modern')} />
                  <div>
                    <strong>Modern Resume</strong>
                    <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0 }}>Clean text-based resume for modern job platforms</p>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, border: exportTemplate === 'minimal' ? '2px solid var(--blue)' : '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="template" checked={exportTemplate === 'minimal'} onChange={() => setExportTemplate('minimal')} />
                  <div>
                    <strong>Minimal Resume</strong>
                    <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0 }}>No-frills plain text compatible with all ATS systems</p>
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 16 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowExportModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={downloadResume}>Download {exportTemplate === 'ats' ? 'ATS Resume' : 'Resume'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}
