import { useState } from 'react'
import { useResumes } from '../hooks/useData'

interface OnboardingProps {
  onComplete: () => void
}

const STEPS = [
  {
    key: 'welcome',
    icon: '&#128075;',
    title: 'Welcome to Meeseeker',
    subtitle: 'Your AI-powered career intelligence dashboard',
    description: 'Track jobs, analyze resumes, and land your dream role faster. Everything stays in your browser.',
  },
  {
    key: 'how',
    icon: '&#128640;',
    title: 'How it works',
    subtitle: 'Three simple steps',
    description: '',
    bullets: [
      { icon: '&#128196;', text: 'Upload or paste your resume for AI analysis' },
      { icon: '&#128269;', text: 'Search jobs from 100+ sources with smart matching' },
      { icon: '&#128200;', text: 'Track applications and get personalized improvements' },
    ],
  },
  {
    key: 'privacy',
    icon: '&#128272;',
    title: 'Your data stays private',
    subtitle: '100% local, zero cloud storage',
    description: 'No accounts, no servers storing your data. API keys stay in your browser. Perfect for sharing on GitHub Pages.',
  },
  {
    key: 'api',
    icon: '&#9881;',
    title: 'API Keys (Optional)',
    subtitle: 'Unlock more job sources and AI features',
    description: '',
    keys: [
      { name: 'JSearch', desc: '100+ job boards, 500/mo free', color: 'var(--green)' },
      { name: 'Apify', desc: 'Scrape Indeed directly', color: 'var(--orange)' },
      { name: 'OpenAI', desc: 'AI resume parsing', color: 'var(--blue)' },
    ],
    skip: true,
  },
  {
    key: 'done',
    icon: '&#127881;',
    title: "You're all set!",
    subtitle: 'Ready to accelerate your job search?',
    description: 'Start by uploading your resume or trying our sample data.',
  },
]

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showSkip, setShowSkip] = useState(false)
  const { latest } = useResumes()

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const isFirstStep = currentStep === 0

  function handleNext() {
    if (isLastStep) {
      localStorage.setItem('onboarding_completed', 'true')
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  function handleBack() {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  function handleSkip() {
    localStorage.setItem('onboarding_completed', 'true')
    onComplete()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20, backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, maxWidth: 520, width: '100%', overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #ff8f5a 100%)',
          padding: '32px 32px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 120, height: 120,
            borderRadius: '50%', background: 'rgba(255,255,255,0.1)'
          }} />
          <div style={{
            position: 'absolute', bottom: -20, left: -20, width: 80, height: 80,
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)'
          }} />
          <div style={{
            fontSize: 48, marginBottom: 16,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))'
          }} dangerouslySetInnerHTML={{ __html: step.icon }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, marginBottom: 6 }}>
            {step.title}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
            {step.subtitle}
          </p>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {step.description && (
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 }}>
              {step.description}
            </p>
          )}

          {step.bullets && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {step.bullets.map((bullet, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10
                }}>
                  <span style={{ fontSize: 20 }} dangerouslySetInnerHTML={{ __html: bullet.icon }} />
                  <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{bullet.text}</span>
                </div>
              ))}
            </div>
          )}

          {step.keys && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {step.keys.map((key, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: key.color
                  }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{key.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-2)', marginLeft: 8 }}>{key.desc}</span>
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 8 }}>
                You can add API keys later in Settings. The app works without them.
              </p>
            </div>
          )}

          {step.key === 'done' && (
            <div style={{ textAlign: 'center' }}>
              {latest && latest.ats_score > 0 ? (
                <div style={{
                  padding: '16px', background: 'rgba(0,214,143,0.1)', borderRadius: 10,
                  border: '1px solid rgba(0,214,143,0.3)', marginBottom: 16
                }}>
                  <span style={{ fontSize: 24 }}>&#9989;</span>
                  <p style={{ fontSize: 13, color: 'var(--green)', margin: '8px 0 0' }}>
                    Resume detected! You're ready to search for jobs.
                  </p>
                </div>
              ) : (
                <div style={{
                  padding: '16px', background: 'var(--surface-2)', borderRadius: 10,
                  border: '1px solid var(--border)', marginBottom: 16
                }}>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>
                    No resume yet? Start with our sample resume to explore all features.
                  </p>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === currentStep ? 24 : 8, height: 8, borderRadius: 4,
                background: i === currentStep ? 'var(--accent)' : i < currentStep ? 'var(--green)' : 'var(--border)',
                transition: 'all 0.3s'
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
            {!isFirstStep ? (
              <button className="btn btn-outline" onClick={handleBack}>
                ← Back
              </button>
            ) : (
              <button className="btn btn-outline" onClick={handleSkip} style={{ opacity: 0.7 }}>
                Skip
              </button>
            )}
            <button className="btn btn-primary" onClick={handleNext} style={{ flex: 1, maxWidth: 200 }}>
              {isLastStep ? "Let's Go!" : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}