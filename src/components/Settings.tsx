import { useState } from 'react'
import { saveApiKey, getApiKeyStatus } from '../lib/api'

interface SettingsProps {
  onClose: () => void
}

const API_PROVIDERS = [
  { key: 'jsearch', label: 'JSearch (RapidAPI)', placeholder: 'Your RapidAPI key', help: 'Free 500 searches/month. Get from rapidapi.com', link: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch' },
  { key: 'apify', label: 'Apify (Indeed Scraper)', placeholder: 'apify_api_...', help: 'Scrapes Indeed listings. Get from console.apify.com', link: 'https://console.apify.com/account#/integrations' },
  { key: 'openai', label: 'OpenAI (Resume AI)', placeholder: 'sk-proj-...', help: 'AI-powered resume parsing. Optional — local parser works without it.', link: 'https://platform.openai.com/api-keys' },
]

export default function Settings({ onClose }: SettingsProps) {
  const status = getApiKeyStatus()
  const [values, setValues] = useState({
    jsearch: localStorage.getItem('api_jsearch') || '',
    apify: localStorage.getItem('api_apify') || '',
    openai: localStorage.getItem('api_openai') || '',
  })
  const [saved, setSaved] = useState(false)

  function handleSave() {
    Object.entries(values).forEach(([key, value]) => {
      saveApiKey(key, value.trim())
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
        padding: 28, maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>API Keys</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>
          Keys are stored in your browser only. They are never shared or uploaded. Each visitor uses their own keys.
        </p>

        {API_PROVIDERS.map(provider => (
          <div key={provider.key} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{provider.label}</label>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 12,
                background: status[provider.key as keyof typeof status] ? 'rgba(0,214,143,0.15)' : 'rgba(238,90,111,0.15)',
                color: status[provider.key as keyof typeof status] ? 'var(--green)' : 'var(--red)',
              }}>
                {status[provider.key as keyof typeof status] ? 'Connected' : 'Not set'}
              </span>
            </div>
            <input
              type="password"
              value={values[provider.key as keyof typeof values]}
              onChange={e => setValues(prev => ({ ...prev, [provider.key]: e.target.value }))}
              placeholder={provider.placeholder}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none',
              }}
            />
            <p style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 4 }}>
              {provider.help}{' '}
              <a href={provider.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Get key &rarr;</a>
            </p>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
            {saved ? 'Saved!' : 'Save Keys'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
