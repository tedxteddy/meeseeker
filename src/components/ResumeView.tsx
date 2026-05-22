import { useState, useEffect, FormEvent } from 'react'
import { analyseResume } from '../lib/api'
import { useResumes } from '../hooks/useData'

const DESIGN_SKILLS = [
  'Adobe Creative Suite', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign',
  'Figma', 'Sketch', 'Typography', 'Layout Design', 'Color Theory',
  'Brand Identity', 'Logo Design', 'Visual Identity', 'Brand Guidelines',
  'UI Design', 'UX Design', 'Interaction Design', 'Motion Design',
  'Animation', 'Video Editing', '3D Modeling', 'Blender',
  'Illustration', 'Print Design', 'Web Design', 'Responsive Design',
  'Prototyping', 'Design Systems', 'Accessibility', 'HTML', 'CSS',
]

let pdfjsLoaded = false

async function loadPdfJs() {
  if (pdfjsLoaded) return true
  if (typeof window === 'undefined') return false

  return new Promise<boolean>((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = ''
        pdfjsLoaded = true
        resolve(true)
      } else {
        resolve(false)
      }
    }
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = (window as any).pdfjsLib
  if (!pdfjsLib) throw new Error('PDF.js not loaded')

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item: any) => item.str).join(' ') + '\n'
  }
  return text
}

export default function ResumeView() {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [pdfReady, setPdfReady] = useState(false)

  const { latest: latestResume, saveResume, createResumeVersion, setActiveResume, deleteResume } = useResumes()

  useEffect(() => {
    loadPdfJs().then(setPdfReady)
    if (latestResume && !text) {
      setText(latestResume.text_content)
      setFileName(latestResume.file_name)
    }
  }, [latestResume])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setError('')

    if (file.name.endsWith('.pdf')) {
      if (!pdfReady) {
        setError('PDF parser loading... try again in a moment, or paste text manually.')
        return
      }
      try {
        const extracted = await extractPdfText(file)
        setText(extracted)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to read PDF')
      }
    } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      setText(await file.text())
    } else {
      setError('Unsupported file type. Use PDF, TXT, or MD files.')
    }
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    setFileName('')
  }

  function handleClearText() {
    setText('')
    setFileName('')
    setError('')
  }

  function handleLoadSample() {
    const sample = `John Doe
john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe | portfolio.com

SUMMARY
Experienced graphic designer with 5 years of expertise in branding, UI/UX design, and visual communication. Proficient in Adobe Creative Suite, Figma, and design systems.

SKILLS
Adobe Photoshop, Adobe Illustrator, Adobe InDesign, Figma, Sketch, Typography, Layout Design, Color Theory, Brand Identity, Logo Design, UI Design, UX Design, Prototyping, HTML, CSS, Design Systems, Accessibility

EXPERIENCE
Senior Graphic Designer | ABC Agency | 2020-Present
- Led branding projects for 15+ clients across tech, retail, and hospitality industries
- Designed UI/UX for web and mobile applications, improving user engagement by 30%
- Created design systems and component libraries for consistent brand experiences
- Collaborated with cross-functional teams including developers, marketers, and product managers

Graphic Designer | XYZ Studio | 2018-2020
- Produced marketing materials including brochures, posters, and digital ads
- Assisted in website redesign projects using Figma and Adobe XD
- Prepared print-ready files for offset and digital printing

EDUCATION
BFA in Graphic Design | University of Arts | 2018

PORTFOLIO
portfolio.com | behance.net/johndoe | dribbble.com/johndoe`
    setText(sample)
    setFileName('sample-resume.txt')
  }

  async function handleAnalyse(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    setAnalyzing(true)
    setError('')

    try {
      const result = await analyseResume(text, fileName || 'Pasted resume')
      saveResume({
        file_name: fileName || 'Pasted resume',
        text_content: text,
        ats_score: result.atsScore,
        best_fit: result.bestFit,
        found_keywords: result.foundKeywords || [],
        missing_keywords: result.missingKeywords || [],
        skills: result.skills || [],
        ats_breakdown: result.atsBreakdown || [],
        analysed_at: result.analysedAt || new Date().toISOString(),
        version: latestResume?.version ?? 1,
        is_active: true,
        parent_id: latestResume?.id ?? null,
        tags: latestResume?.tags ?? [],
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyse resume')
    } finally {
      setAnalyzing(false)
    }
  }

  function handleCreateVersion() {
    if (!latestResume) return
    createResumeVersion(latestResume.id)
  }

  function handleSetAsActive() {
    if (!latestResume) return
    setActiveResume(latestResume.id)
  }

  function handleDeleteResume() {
    if (!latestResume) return
    if (window.confirm('Are you sure you want to delete this resume?')) {
      deleteResume(latestResume.id)
    }
  }

  const getSkills = latestResume?.skills || []
  const getBreakdown = latestResume?.ats_breakdown || []
  const getFoundSkills = DESIGN_SKILLS.filter(s =>
    (latestResume?.text_content || text).toLowerCase().includes(s.toLowerCase())
  )

  const renderSkeleton = (height: number) => (
    <div style={{
      height: `${height}px`,
      borderRadius: 4,
      background: 'linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'loading 1.5s infinite',
      marginBottom: 8
    }}></div>
  )

  return (
    <>
      <div className="resume-bar">
        <div className="resume-upload-wrap">
          <button className="btn btn-outline btn-sm">
            &#128196; {pdfReady ? 'Upload PDF/TXT' : 'Upload TXT'}
          </button>
          <input
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileUpload}
          />
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={handleLoadSample}
          disabled={analyzing}
        >
          &#128202; Sample Resume
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleAnalyse}
          disabled={analyzing || !text.trim()}
        >
          {analyzing ? (
            <>
              <span className="spinner"></span>
              Analysing...
            </>
          ) : 'Analyse Resume'}
        </button>
        {latestResume && (
          <div className="resume-status">
            <span className="resume-chip">&#128196;</span>
            <span className="name">{latestResume.file_name}</span>
            <span className="resume-chip">ATS {latestResume.ats_score}</span>
            <div className="version-controls" style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-outline btn-xs" onClick={handleCreateVersion}>
                &#8634; Version
              </button>
              <button className="btn btn-outline btn-xs" onClick={handleSetAsActive}>
                &#10003; Active
              </button>
              <button className="btn btn-outline btn-xs" onClick={handleDeleteResume}>
                &#215; Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {text.trim() && !latestResume && (
        <button
          className="btn btn-link"
          onClick={handleClearText}
          style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}
        >
          &#215; Clear
        </button>
      )}

      {error && (
        <div className="toast error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>&#9888;</span>
          <span>{error}</span>
          <button
            className="btn btn-outline btn-xs"
            onClick={handleAnalyse}
            disabled={analyzing || !text.trim()}
          >
            Retry
          </button>
        </div>
      )}

      {!latestResume && !text && (
        <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="icon" style={{ fontSize: 48, marginBottom: 16 }}>&#128196;</div>
          <h3 style={{ marginBottom: 12 }}>No resume analysed yet</h3>
          <p style={{ color: 'var(--text-2)', marginBottom: 24, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            Upload your resume or paste the text below to get started with ATS scoring and skill gap analysis.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleLoadSample} disabled={analyzing}>
              &#128202; Try with Sample Resume
            </button>
            <button
              className="btn btn-outline"
              onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
              disabled={analyzing || !pdfReady}
            >
              &#128196; Upload PDF/TXT
            </button>
          </div>
        </div>
      )}

      {!latestResume && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ fontSize: 14, margin: 0 }}>Paste your resume</h3>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {text.length} characters
            </span>
          </div>
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Paste your resume text here..."
            style={{
              width: '100%',
              minHeight: 120,
              padding: 12,
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontFamily: 'inherit',
              fontSize: 14,
              resize: 'vertical'
            }}
          />
        </div>
      )}

      {latestResume && (
        <>
          <div className="stats-bar">
            <span>ATS Score: <strong style={{ color: latestResume.ats_score >= 60 ? 'var(--green)' : latestResume.ats_score >= 40 ? 'var(--orange)' : 'var(--red)' }}>{latestResume.ats_score}/100</strong></span>
            <span>Best Fit: <strong>{latestResume.best_fit}</strong></span>
            <span className="stat-chip">{getFoundSkills.length} design skills detected</span>
          </div>

          {getFoundSkills.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="skills-cloud">
                {getFoundSkills.map((s, i) => (
                  <span key={i} className="skill-tag matched">{s}</span>
                ))}
              </div>
            </div>
          )}

          {getSkills.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, marginBottom: 12 }}>Skill Scores</h3>
              {getSkills.map((skill: { name: string; current: number; target: number }, i: number) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 40px', gap: 10, alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
                  <strong>{skill.name}</strong>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${skill.current}%`, background: `linear-gradient(90deg, var(--green), var(--blue))`, borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{skill.current}</span>
                </div>
              ))}
            </div>
          )}

          {getBreakdown.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 13, marginBottom: 12 }}>ATS Breakdown</h3>
              {getBreakdown.map((item: { label: string; score: number; note: string }, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', padding: '10px 0', borderBottom: i < getBreakdown.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                  <div>
                    <strong>{item.label}</strong>
                    <p style={{ color: 'var(--text-2)', marginTop: 3, fontSize: 11 }}>{item.note}</p>
                  </div>
                  <span className={`match-score ${item.score >= 60 ? 'match-high' : item.score >= 40 ? 'match-mid' : 'match-low'}`}>{item.score}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {analyzing && !latestResume && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 24 }}>
          <div className="stats-bar">
            <span>ATS Score: <strong>{renderSkeleton(20)}</strong></span>
            <span>Best Fit: <strong>{renderSkeleton(20)}</strong></span>
            <span className="stat-chip">{renderSkeleton(20)}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="skills-cloud">
              {[1, 2, 3, 4, 5].map((_, i) => (
                <span key={i} className="skill-tag matched" style={{ opacity: 0.7 }}>Skill {i + 1}</span>
              ))}
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontSize: 13, marginBottom: 12 }}>Skill Scores</h3>
            {[1, 2, 3].map((_, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 40px', gap: 10, alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
                <strong>Skill Name {i + 1}</strong>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '60%', background: `linear-gradient(90deg, var(--green), var(--blue))`, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{60 + i * 10}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontSize: 13, marginBottom: 12 }}>ATS Breakdown</h3>
            {[1, 2, 3].map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                <div>
                  <strong>Category {i + 1}</strong>
                  <p style={{ color: 'var(--text-2)', marginTop: 3, fontSize: 11 }}>Note about this category</p>
                </div>
                <span className="match-score match-mid">{70 + i * 5}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!latestResume && text && !analyzing && !error && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {fileName || 'Pasted text'} loaded ({text.split(/\s+/).length} words).
            Click <strong>Analyse Resume</strong> to get your ATS score and skill breakdown.
          </p>
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <button className="btn btn-sm btn-outline" onClick={handleAnalyse}>
              Analyse Resume
            </button>
          </div>
        </div>
      )}
    </>
  )
}
