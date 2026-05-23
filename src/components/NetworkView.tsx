import { useState } from 'react'

const TEMPLATES: Record<string, string> = {
  recruiter: `Subject: Graphic Design Intern application

Hi [Name],

I saw the [Role] opening at [Company]. My background is a close match for brand and social design work: I recently supported social media posters, motion graphics, and in-app banners at Hike, and I have completed brand identity work for Toastmasters International and Nest Cafe Lounge.

I work across Adobe Creative Cloud, Figma, Canva, Blender, and Maya, and I can share a concise portfolio with branding, social media, and UI-focused samples. I would value the chance to apply and show how I can contribute quickly.

Best,
[Your Name]`,

  referral: `Hi [Name],

I am applying for [Role] at [Company] and noticed your work there. I am a junior designer focused on brand, visual, social, and UI design, with internship experience at Hike and Braand School plus freelance branding work for Toastmasters.

If you are open to it, could I send you my portfolio for a quick look? If the work feels relevant, I would be grateful for a referral or a pointer to the right hiring contact.

Thanks,
[Your Name]`,

  followup: `Hi [Name],

Following up on my note about the [Role] opening. I am especially interested because the role combines the exact areas I am building around: brand systems, social creatives, motion, Figma workflows, and fast iteration.

I can share a short portfolio and a role-specific sample if useful. Thanks for considering my application.

Best,
[Your Name]`,

  linkedin: `Hi [Name], I am a junior designer with experience across Adobe, Figma, Canva, branding, social media creatives, and motion assets. I am applying for [Role] at [Company] and would value a quick portfolio review or referral pointer if you are open to it.`,
}

interface NetworkViewProps {
  targets: Array<{ id: string; label: string; target_count: number; sent_count: number; reply_count: number }>
  onLogSent: (id: string) => void
  onLogReply: (id: string) => void
}

export default function NetworkView({ targets, onLogSent, onLogReply }: NetworkViewProps) {
  const [activeTab, setActiveTab] = useState('recruiter')
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(TEMPLATES[activeTab])
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const sent = targets.reduce((sum, t) => sum + t.sent_count, 0)
  const replies = targets.reduce((sum, t) => sum + t.reply_count, 0)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16 }}>
          <h3 style={{ fontSize: 13, marginBottom: 12 }}>Outreach Templates</h3>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
            {Object.keys(TEMPLATES).map(key => (
              <button
                key={key}
                className={`btn btn-sm ${activeTab === key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab(key)}
              >
                {key}
              </button>
            ))}
          </div>
          <textarea
            value={TEMPLATES[activeTab]}
            readOnly
            style={{
              width: '100%',
              minHeight: 180,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 0,
              padding: 12,
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: 12,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0, padding: 16 }}>
          <h3 style={{ fontSize: 13, marginBottom: 12 }}>Response Analytics</h3>
          <div style={{ background: 'var(--surface-2)', borderRadius: 0, padding: 12, marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{sent} sent</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{replies} replies — {sent ? Math.round((replies / sent) * 100) : 0}% response rate</div>
          </div>
          <div className="network-grid" style={{ gridTemplateColumns: '1fr' }}>
            {targets.map(target => {
              const rate = target.sent_count ? Math.round((target.reply_count / target.sent_count) * 100) : 0
              return (
                <div key={target.id} className="network-card" style={{ marginBottom: 8 }}>
                  <h4>{target.label}</h4>
                  <p>Goal: {target.target_count} · Sent: {target.sent_count} · Replies: {target.reply_count} · {rate}%</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => onLogSent(target.id)}>Log sent</button>
                    <button className="btn btn-outline btn-sm" onClick={() => onLogReply(target.id)}>Log reply</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
