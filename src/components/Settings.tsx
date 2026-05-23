import { useState } from 'react'
import { saveApiKey, getApiKeyStatus } from '../lib/api'
import { getNotionConfig, saveNotionConfig, verifyNotionConnection } from '../lib/notion'

interface SettingsProps {
  onClose: () => void
  onNotionSync?: () => void
}

const API_PROVIDERS = [
  { key: 'jsearch', label: 'JSearch (RapidAPI)', placeholder: 'Your RapidAPI key', help: 'Free 500 searches/month. Get from rapidapi.com', link: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch', badge: '(needs key)', free: false },
  { key: 'apify', label: 'Apify (Indeed Scraper)', placeholder: 'apify_api_...', help: 'Scrapes Indeed listings. Get from console.apify.com', link: 'https://console.apify.com/account#/integrations', badge: '(needs key)', free: false },
  { key: 'openai', label: 'OpenAI (Resume AI)', placeholder: 'sk-proj-...', help: 'AI-powered resume parsing.', link: 'https://platform.openai.com/api-keys', badge: '(needs key)', free: false },
  { key: 'adzuna', label: 'Adzuna', placeholder: 'app_id:app_key', help: 'Free tier available (50 calls/day). Get from developer.adzuna.com', link: 'https://developer.adzuna.com/account', badge: '(needs key)', free: false },
  { key: 'jooble', label: 'Jooble', placeholder: 'Your Jooble API key', help: 'Free 100 searches/day. Get from jooble.org/api', link: 'https://jooble.org/api', badge: '(needs key)', free: false },
  { key: 'jobicy', label: 'Jobicy (Remote Jobs)', placeholder: '', help: 'Free remote job listings, no API key required.', link: 'https://jobicy.com/api/v2/remote-jobs', badge: '(free)', free: true },
  { key: 'claude', label: 'Claude (Anthropic)', placeholder: 'sk-ant-...', help: 'AI resume analysis. Get from console.anthropic.com', link: 'https://console.anthropic.com/', badge: '(needs key)', free: false },
  { key: 'gemini', label: 'Gemini (Google AI)', placeholder: 'AIza...', help: 'AI resume analysis. Get from aistudio.google.com', link: 'https://aistudio.google.com/apikey', badge: '(needs key)', free: false },
]

function getStored(key: string, fallback = '') {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}

export default function Settings({ onClose, onNotionSync }: SettingsProps) {
  const status = getApiKeyStatus()
  const notionConfig = getNotionConfig()
  const [values, setValues] = useState({
    jsearch: getStored('api_jsearch'),
    apify: getStored('api_apify'),
    openai: getStored('api_openai'),
    adzuna: getStored('api_adzuna'),
    jooble: getStored('api_jooble'),
    claude: getStored('api_claude'),
    gemini: getStored('api_gemini'),
  })
  const [notion, setNotion] = useState({
    enabled: notionConfig.enabled,
    apiKey: notionConfig.apiKey,
    databaseId: notionConfig.databaseId,
  })
  const [saved, setSaved] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'keys' | 'notion' | 'sync'>('keys')

  function handleSave() {
    Object.entries(values).forEach(([key, value]) => {
      saveApiKey(key, value.trim())
    })
    saveNotionConfig(notion)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleVerifyNotion() {
    setVerifying(true)
    setVerifyResult(null)
    const result = await verifyNotionConnection(notion.apiKey, notion.databaseId)
    setVerifyResult(result)
    setVerifying(false)
  }

  function handleNotionToggle(enabled: boolean) {
    const newNotion = { ...notion, enabled }
    setNotion(newNotion)
    saveNotionConfig(newNotion)
    if (enabled && onNotionSync) onNotionSync()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 0,
        padding: 28, maxWidth: 580, width: '100%', maxHeight: '90vh', overflow: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface-2)', padding: 4, borderRadius: 0 }}>
          {[
            { key: 'keys', label: 'API Keys', icon: '&#128273;' },
            { key: 'notion', label: 'Notion', icon: '&#128203;' },
            { key: 'sync', label: 'Sync', icon: '&#128259;' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 0, border: 'none', fontSize: 12, fontWeight: 500,
                fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
                background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'var(--text-2)',
              }}
              dangerouslySetInnerHTML={{ __html: `${tab.icon} ${tab.label}` }}
            />
          ))}
        </div>

        {activeTab === 'keys' && (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>
              Keys are stored in your browser only. They are never shared or uploaded. Each visitor uses their own keys.
            </p>

            {API_PROVIDERS.map(provider => (
              <div key={provider.key} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                    {provider.label}{' '}
                    <span style={{ fontSize: 10, color: provider.free ? 'var(--green)' : 'var(--text-2)', fontWeight: 400 }}>
                      {provider.badge}
                    </span>
                  </label>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 0,
                    background: provider.free ? 'rgba(0,214,143,0.15)' : (status[provider.key as keyof typeof status] ? 'rgba(0,214,143,0.15)' : 'rgba(238,90,111,0.15)'),
                    color: provider.free ? 'var(--green)' : (status[provider.key as keyof typeof status] ? 'var(--green)' : 'var(--red)'),
                  }}>
                    {provider.free ? 'Free' : (status[provider.key as keyof typeof status] ? 'Connected' : 'Not set')}
                  </span>
                </div>
                {!provider.free && (
                  <input
                    type="password"
                    value={values[provider.key as keyof typeof values] || ''}
                    onChange={e => setValues(prev => ({ ...prev, [provider.key]: e.target.value }))}
                    placeholder={provider.placeholder}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 0,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none',
                    }}
                  />
                )}
                <p style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 4 }}>
                  {provider.help}{' '}
                  {!provider.free && <a href={provider.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Get key &rarr;</a>}
                </p>
              </div>
            ))}
          </>
        )}

        {activeTab === 'notion' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 14, margin: 0, color: 'var(--text)' }}>Notion Integration</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '4px 0 0' }}>
                    Sync jobs and applications with your Notion database
                  </p>
                </div>
                <button
                  onClick={() => handleNotionToggle(!notion.enabled)}
                  style={{
                    width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                    background: notion.enabled ? 'var(--green)' : 'var(--surface-2)',
                    position: 'relative', transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 2, left: notion.enabled ? 24 : 2,
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }} />
                </button>
              </div>

              <div style={{
                padding: '12px', background: notion.enabled ? 'rgba(0,214,143,0.08)' : 'var(--surface-2)',
                borderRadius: 0, border: `1px solid ${notion.enabled ? 'rgba(0,214,143,0.3)' : 'var(--border)'}`,
                opacity: notion.enabled ? 1 : 0.6, transition: 'all 0.2s'
              }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                  Integration Token
                </label>
                <input
                  type="password"
                  value={notion.apiKey}
                  onChange={e => setNotion(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="secret_..."
                  disabled={!notion.enabled}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 0,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none',
                    marginBottom: 12
                  }}
                />
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                  Database ID
                </label>
                <input
                  type="text"
                  value={notion.databaseId}
                  onChange={e => setNotion(prev => ({ ...prev, databaseId: e.target.value }))}
                  placeholder="32-character database ID from your Notion database URL"
                  disabled={!notion.enabled}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 0,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none',
                  }}
                />
                <p style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 8 }}>
                  Share your database with the integration: Open Notion DB → Share → Invite integration
                </p>
              </div>

              <button
                className="btn btn-outline btn-sm"
                onClick={handleVerifyNotion}
                disabled={!notion.enabled || !notion.apiKey || !notion.databaseId || verifying}
                style={{ marginTop: 12 }}
              >
                {verifying ? 'Verifying...' : 'Verify Connection'}
              </button>

              {verifyResult && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 0, fontSize: 12,
                  background: verifyResult.success ? 'rgba(0,214,143,0.15)' : 'rgba(238,90,111,0.15)',
                  color: verifyResult.success ? 'var(--green)' : 'var(--red)'
                }}>
                  {verifyResult.success ? '✓ Connected successfully!' : `✗ ${verifyResult.error}`}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--surface-2)', borderRadius: 0, padding: 14 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Database Properties Required</h4>
              <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8 }}>
                Create these properties in your Notion database:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10 }}>
                {['Role (title)', 'Company (text)', 'Location (text)', 'Source (select)', 'Fit Score (number)', 'Growth Score (number)', 'Probability (select)', 'Compensation (text)', 'Tags (multi-select)', 'Skills Required (multi-select)', 'Stage (select)', 'Applied (checkbox)', 'Applied Date (date)', 'Source URL (url)'].map(prop => (
                  <span key={prop} style={{ color: 'var(--text-2)', padding: '4px 6px', background: 'var(--bg)', borderRadius: 4 }}>
                    {prop}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'sync' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Sync Settings</h3>
              <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
                Choose how data syncs between Meeseeker and Notion.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { id: 'manual', label: 'Manual Sync', desc: 'Only sync when you click the sync button' },
                  { id: 'auto', label: 'Auto Sync', desc: 'Automatically sync all changes (jobs, applications) to Notion' },
                ].map(option => (
                  <label key={option.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: 'var(--surface-2)', borderRadius: 0, cursor: 'pointer', fontSize: 12
                  }}>
                    <input
                      type="radio"
                      name="syncMode"
                      checked={getStored('notion_sync_mode') === option.id || (!getStored('notion_sync_mode') && option.id === 'manual')}
                      onChange={() => { try { localStorage.setItem('notion_sync_mode', option.id) } catch { /* ignore */ } }}
                    />
                    <div>
                      <strong style={{ display: 'block' }}>{option.label}</strong>
                      <span style={{ color: 'var(--text-2)', fontSize: 11 }}>{option.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--surface-2)', borderRadius: 0, padding: 14 }}>
              <h4 style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Sync Now</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => onNotionSync?.()}>
                  &#8635; Push to Notion
                </button>
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 8 }}>
                Push all your tracked jobs and applications to your Notion database.
              </p>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}