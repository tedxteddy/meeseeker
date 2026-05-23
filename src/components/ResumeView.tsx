import { useState, useEffect, FormEvent } from 'react'
import { analyseResume, findJobsFromResume, type AutoSearchResult } from '../lib/api'
import { useResumes } from '../hooks/useData'

interface ResumeViewProps {
  onAutoSearch?: (results: AutoSearchResult) => void
}

interface ExtractedUrl {
  type: 'linkedin' | 'portfolio' | 'github' | 'website'
  url: string
  label: string
}

interface PortfolioScore {
  overall: number
  sections: { name: string; score: number; missing: string[] }[]
}

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

function extractUrls(text: string): ExtractedUrl[] {
  const urls: ExtractedUrl[] = []
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi
  const matches = text.match(urlRegex) || []

  for (const url of matches) {
    const lower = url.toLowerCase()
    if (lower.includes('linkedin.com')) {
      urls.push({ type: 'linkedin', url, label: 'LinkedIn' })
    } else if (lower.includes('github.com')) {
      urls.push({ type: 'github', url, label: 'GitHub' })
    } else if (lower.includes('behance.net') || lower.includes('dribbble.com') || lower.includes('portfolio') || lower.includes(' folio')) {
      urls.push({ type: 'portfolio', url, label: 'Portfolio' })
    } else if (lower.includes('http') && !lower.includes('linkedin') && !lower.includes('github')) {
      urls.push({ type: 'website', url, label: 'Website' })
    }
  }
  return urls
}

function calculatePortfolioScore(text: string): PortfolioScore {
  const lower = text.toLowerCase()
  let overall = 0
  const sections = [] as { name: string; score: number; missing: string[] }[]

  const checks = [
    { name: 'Contact Info', patterns: [/\bemail\b/i, /\b@/, /\bphone\b/i, /\btel\b/i] },
    { name: 'Summary', patterns: [/\bsummary\b/i, /\bobjective\b/i, /\babout\s*me\b/i] },
    { name: 'Experience', patterns: [/\bexperience\b/i, /\bwork\s*history\b/i, /\bemployment\b/i] },
    { name: 'Education', patterns: [/\beducation\b/i, /\bdegree\b/i, /\buniversity\b/i, /\bcollege\b/i] },
    { name: 'Skills', patterns: [/\bskills\b/i, /\btechnologies\b/i, /\bcompetencies\b/i] },
    { name: 'Portfolio Links', patterns: [/behance|dribbble|portfolio|github/i] },
    { name: 'LinkedIn', patterns: [/linkedin\.com/i] },
  ]

  let found = 0
  for (const check of checks) {
    const matched = check.patterns.some(p => p.test(lower))
    const missing = check.patterns.filter(p => !p.test(lower)).map(() => check.name)
    if (matched) found++
    sections.push({
      name: check.name,
      score: matched ? 100 : 0,
      missing: matched ? [] : [check.name]
    })
  }

  overall = Math.round((found / checks.length) * 100)

  return { overall, sections }
}

function inferIndustry(text: string): string {
  const lower = text.toLowerCase()
  if (/\b(design|graphic|visual|brand|creative)\b/.test(lower)) return 'Design'
  if (/\b(developer|engineer|software|programming)\b/.test(lower)) return 'Engineering'
  if (/\b(marketing|sales|growth)\b/.test(lower)) return 'Marketing'
  if (/\b(product|manager|pm)\b/.test(lower)) return 'Product'
  if (/\b(data|science|analytics)\b/.test(lower)) return 'Data'
  return 'General'
}

const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'review', label: 'Review' },
]

export default function ResumeView({ onAutoSearch }: ResumeViewProps = {}) {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [error, setError] = useState('')
  const [pdfReady, setPdfReady] = useState(false)
  const [extractedUrls, setExtractedUrls] = useState<ExtractedUrl[]>([])
  const [portfolioScore, setPortfolioScore] = useState<PortfolioScore | null>(null)
  const [detectedIndustry, setDetectedIndustry] = useState('')
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)
  const [searchingJobs, setSearchingJobs] = useState(false)
  const [searchJobsError, setSearchJobsError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { latest: latestResume, saveResume, createResumeVersion, setActiveResume, deleteResume, allResumes } = useResumes()

  useEffect(() => {
    loadPdfJs().then(setPdfReady)
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [])

  useEffect(() => {
    if (latestResume && !text) {
      setText(latestResume.text_content)
      setFileName(latestResume.file_name)
      setExtractedUrls(extractUrls(latestResume.text_content))
      setPortfolioScore(calculatePortfolioScore(latestResume.text_content))
      setDetectedIndustry(inferIndustry(latestResume.text_content))
    }
  }, [latestResume])

  useEffect(() => {
    if (text && !latestResume) {
      setExtractedUrls(extractUrls(text))
      setPortfolioScore(calculatePortfolioScore(text))
      setDetectedIndustry(inferIndustry(text))
    }
  }, [text, latestResume])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setError('')
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    const blobUrl = URL.createObjectURL(file)
    setPreviewUrl(blobUrl)

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
    setAnalysisStep(0)

    try {
      setAnalysisStep(1)
      const result = await analyseResume(text, fileName || 'Pasted resume')
      setAnalysisStep(2)
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
        tags: [detectedIndustry],
      })
      setAnalysisStep(3)
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

  function openPreview() {
    if (previewUrl) window.open(previewUrl, '_blank')
  }

  async function handleFindJobs() {
    if (!latestResume) return
    setSearchingJobs(true)
    setSearchJobsError('')
    try {
      const results = await findJobsFromResume(
        latestResume.best_fit,
        latestResume.skills,
      )
      if (results.total_found === 0) {
        setSearchJobsError('No jobs found. Try a different resume or update your skills.')
      } else {
        onAutoSearch?.(results)
      }
    } catch (err: unknown) {
      setSearchJobsError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearchingJobs(false)
    }
  }

  const getSkills = latestResume?.skills || []
  const getBreakdown = latestResume?.ats_breakdown || []
  const getFoundSkills = DESIGN_SKILLS.filter(s =>
    (latestResume?.text_content || text).toLowerCase().includes(s.toLowerCase())
  )

  const currentStep = analyzing ? (analysisStep === 1 ? 'Extracting text...' : analysisStep === 2 ? 'Analyzing with AI...' : 'Finalizing...') : null

  const getStepProgress = () => {
    if (!analyzing) return null
    if (analysisStep === 1) return { current: 0, total: 3 }
    if (analysisStep === 2) return { current: 1, total: 3 }
    if (analysisStep === 3) return { current: 2, total: 3 }
    return null
  }

  const progress = getStepProgress()

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

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      {STEPS.map((step, i) => (
        <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={() => setHoveredStep(i)} onMouseLeave={() => setHoveredStep(null)}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: i < (progress?.current || 0) ? 'var(--green)' : i === (progress?.current || 0) ? 'var(--accent)' : 'var(--surface-2)',
            border: i === (progress?.current || 0) ? '2px solid var(--accent)' : '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: i <= (progress?.current || 0) ? '#fff' : 'var(--text-2)',
            transition: 'all 0.3s'
          }}>
            {i < (progress?.current || 0) ? '✓' : i + 1}
          </div>
          <span style={{ fontSize: 11, color: i === (progress?.current || 0) ? 'var(--accent)' : 'var(--text-2)', fontWeight: i === (progress?.current || 0) ? 600 : 400 }}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && <div style={{ width: 24, height: 1, background: i < (progress?.current || 0) ? 'var(--green)' : 'var(--border)' }} />}
        </div>
      ))}
      {currentStep && <span style={{ fontSize: 11, color: 'var(--text-2)', marginLeft: 8 }}>{currentStep}</span>}
    </div>
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
        <div className="empty-state" style={{
          textAlign: 'center', padding: '48px 20px',
          background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)',
          borderRadius: 0, border: '1px dashed var(--border)', marginBottom: 20
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent) 0%, #ff8f5a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 36
          }}>&#128196;</div>
          <h3 style={{ marginBottom: 10, fontSize: 18, fontWeight: 700 }}>Start with your resume</h3>
          <p style={{
            color: 'var(--text-2)', marginBottom: 24, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto',
            lineHeight: 1.6
          }}>
            Upload your resume to get AI-powered ATS scoring, skill gap analysis, and personalized job matches.
          </p>
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
            marginBottom: 20
          }}>
            {['ATS Scoring', 'Skill Analysis', 'Job Matching', 'Keyword Optimization'].map((feature, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '6px 12px', borderRadius: 0,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-2)'
              }}>
                {feature}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleLoadSample} disabled={analyzing} style={{ padding: '10px 24px' }}>
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
          <p style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 16 }}>
            Supports PDF, TXT, and MD files. Your data stays in your browser.
          </p>
        </div>
      )}

      {!latestResume && analyzing && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 0, padding: 24, marginTop: 16, textAlign: 'center'
        }}>
          {renderStepIndicator()}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent) 0%, #ff8f5a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto', fontSize: 28, animation: 'pulse 1.5s infinite'
            }}>&#128640;</div>
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            {analysisStep === 1 && 'Reading and parsing your resume...'}
            {analysisStep === 2 && 'Running AI analysis for ATS score and skills...'}
            {analysisStep === 3 && 'Generating recommendations...'}
          </p>
        </div>
      )}

      {!latestResume && !text && !analyzing && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 0, padding: 16, marginBottom: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>&#9998;</span> Paste your resume
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {text.length} characters
            </span>
          </div>
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Or paste your resume text here to get started..."
            style={{
              width: '100%',
              minHeight: 160,
              padding: 12,
              border: '1px solid var(--border)',
              borderRadius: 0,
              fontFamily: 'inherit',
              fontSize: 13,
              resize: 'vertical',
              background: 'var(--bg)',
              color: 'var(--text)',
              lineHeight: 1.6
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
              {text.split(/\s+/).filter(Boolean).length} words detected
            </span>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleAnalyse}
              disabled={!text.trim()}
            >
              Analyze Resume
            </button>
          </div>
        </div>
      )}

      {latestResume && (
        <>
          <div className="stats-bar" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', flex: 1 }}>
              <div style={{
                background: latestResume.ats_score >= 60 ? 'rgba(0,214,143,0.12)' : latestResume.ats_score >= 40 ? 'rgba(255,159,67,0.12)' : 'rgba(238,90,111,0.12)',
                padding: '12px 20px', borderRadius: 0, border: `1px solid ${latestResume.ats_score >= 60 ? 'rgba(0,214,143,0.3)' : latestResume.ats_score >= 40 ? 'rgba(255,159,67,0.3)' : 'rgba(238,90,111,0.3)'}`,
                textAlign: 'center', minWidth: 100
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: latestResume.ats_score >= 60 ? 'var(--green)' : latestResume.ats_score >= 40 ? 'var(--orange)' : 'var(--red)' }}>
                  {latestResume.ats_score}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>ATS Score</div>
              </div>
              {detectedIndustry && (
                <div style={{ background: 'var(--surface-2)', padding: '12px 20px', borderRadius: 0, border: '1px solid var(--border)', textAlign: 'center', minWidth: 100 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{detectedIndustry}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Industry</div>
                </div>
              )}
              {portfolioScore && (
                <div style={{ background: portfolioScore.overall >= 70 ? 'rgba(0,214,143,0.12)' : portfolioScore.overall >= 40 ? 'rgba(255,159,67,0.12)' : 'rgba(238,90,111,0.12)', padding: '12px 20px', borderRadius: 0, border: `1px solid ${portfolioScore.overall >= 70 ? 'rgba(0,214,143,0.3)' : portfolioScore.overall >= 40 ? 'rgba(255,159,67,0.3)' : 'rgba(238,90,111,0.3)'}`, textAlign: 'center', minWidth: 100 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: portfolioScore.overall >= 70 ? 'var(--green)' : portfolioScore.overall >= 40 ? 'var(--orange)' : 'var(--red)' }}>
                    {portfolioScore.overall}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Profile</div>
                </div>
              )}
            </div>
            {previewUrl && (
              <button
                className="btn btn-sm"
                onClick={openPreview}
                style={{ whiteSpace: 'nowrap', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                title="Open original file"
              >
                &#128196; Preview
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleFindJobs}
              disabled={searchingJobs}
              style={{ whiteSpace: 'nowrap' }}
            >
              {searchingJobs ? <><span className="spinner"></span> Searching...</> : '🔍 Find Jobs'}
            </button>
          </div>

          {searchJobsError && (
            <div style={{ background: 'rgba(238,90,111,0.12)', border: '1px solid rgba(238,90,111,0.3)', borderRadius: 0, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--red)' }}>
              &#9888; {searchJobsError}
            </div>
          )}

          {extractedUrls.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, marginBottom: 12 }}>&#128279; Detected Links</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {extractedUrls.map((url, i) => (
                  <a key={i} href={url.url} target="_blank" rel="noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 0, fontSize: 11,
                    background: url.type === 'linkedin' ? 'rgba(10,102,194,0.15)' : url.type === 'github' ? 'rgba(255,255,255,0.1)' : 'rgba(255,107,53,0.15)',
                    border: `1px solid ${url.type === 'linkedin' ? 'rgba(10,102,194,0.4)' : url.type === 'github' ? 'rgba(255,255,255,0.2)' : 'rgba(255,107,53,0.4)'}`,
                    color: 'var(--text)', textDecoration: 'none'
                  }}>
                    {url.type === 'linkedin' && '&#128100;'}
                    {url.type === 'github' && '&#128187;'}
                    {url.type === 'portfolio' && '&#127912;'}
                    {url.type === 'website' && '&#127760;'}
                    <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {allResumes.length > 1 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, marginBottom: 10 }}>&#128198; Version History</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allResumes.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveResume(r.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 0, fontSize: 11,
                      background: r.is_active ? 'var(--accent)' : 'var(--surface-2)',
                      border: r.is_active ? '1px solid var(--accent)' : '1px solid var(--border)',
                      color: r.is_active ? '#fff' : 'var(--text-2)',
                      cursor: 'pointer'
                    }}
                  >
                    v{r.version} {r.is_active && '✓'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {getFoundSkills.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Detected Skills ({getFoundSkills.length})</div>
              <div className="skills-cloud">
                {getFoundSkills.map((s, i) => (
                  <span key={i} className="skill-tag matched">{s}</span>
                ))}
              </div>
            </div>
          )}

          {getSkills.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, marginBottom: 12 }}>&#9878; Skill Proficiency</h3>
              {getSkills.map((skill: { name: string; current: number; target: number }, i: number) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 40px', gap: 10, alignItems: 'center', marginBottom: 10, fontSize: 12 }}>
                  <strong style={{ fontSize: 11 }}>{skill.name}</strong>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%',
                      width: `${skill.current}%`,
                      background: skill.current >= 70 ? 'linear-gradient(90deg, var(--green), #00b377)' : skill.current >= 40 ? 'linear-gradient(90deg, var(--orange), #ffb347)' : 'linear-gradient(90deg, var(--red), #ff7b7b)',
                      borderRadius: 4,
                      transition: 'width 0.4s'
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'right' }}>{skill.current}%</span>
                </div>
              ))}
            </div>
          )}

          {getBreakdown.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16 }}>
              <h3 style={{ fontSize: 13, marginBottom: 12 }}>&#128202; ATS Factor Breakdown</h3>
              {getBreakdown.map((item: { label: string; score: number; note: string }, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', padding: '10px 0', borderBottom: i < getBreakdown.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{item.label}</strong>
                    <p style={{ color: 'var(--text-2)', marginTop: 3, fontSize: 11, lineHeight: 1.5 }}>{item.note}</p>
                  </div>
                  <span className={`match-score ${item.score >= 60 ? 'match-high' : item.score >= 40 ? 'match-mid' : 'match-low'}`} style={{ marginLeft: 12 }}>{item.score}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {analyzing && !latestResume && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16, marginTop: 24 }}>
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
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16 }}>
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
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16 }}>
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
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 14, marginBottom: 16 }}>
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
