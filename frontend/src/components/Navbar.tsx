import { useState, useEffect, useRef } from 'react'
import { getApiUrl, setApiUrl, getApiKey, setApiKey, uploadDatabase } from '../api'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const [apiUrlInput, setApiUrlInput] = useState(getApiUrl() || 'http://localhost:8000')
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey())
  
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [uploadError, setUploadError] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const saveSettings = () => {
    setApiUrl(apiUrlInput)
    setApiKey(apiKeyInput)
    setShowSettings(false)
    setUploadSuccess('')
    setUploadError('')
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Playground', href: '#playground' },
  ]

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError('')
    setUploadSuccess('')
    setUploadProgress(0)

    try {
      // Need to set API URL first if they changed it, so upload goes to the right place
      setApiUrl(apiUrlInput)
      const res = await uploadDatabase(file, (pct) => setUploadProgress(pct))
      if (res.success) {
        setUploadSuccess(res.message || 'Database uploaded and indexed successfully!')
      } else {
        setUploadError('Upload failed.')
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload database.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--nav-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      background: scrolled ? 'rgba(8, 11, 18, 0.85)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
      zIndex: 100,
      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* Logo */}
      <a href="#" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'var(--gradient-brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 700,
          color: '#fff',
          fontFamily: 'var(--font-display)',
        }}>
          Q
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          QueryMind
        </span>
      </a>

      {/* Nav links */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
      }}>
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              transition: 'color 0.2s',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            {link.label}
          </a>
        ))}

        <button
          onClick={() => setShowSettings(true)}
          className="qm-btn-secondary"
          style={{
            padding: '8px',
            fontSize: '16px',
            background: 'transparent',
            border: 'none',
          }}
          title="Settings"
        >
          ⚙️
        </button>

        <a
          href="https://github.com/ridash2005/SQL-Query-Generator"
          target="_blank"
          rel="noopener noreferrer"
          className="qm-btn-secondary"
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            gap: '6px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
        </a>
      </div>

      {showSettings && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="qm-glass-card" style={{ width: '450px', padding: '30px' }}>
            <h3 style={{ marginBottom: '10px' }}>Settings & Connections</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              Configure your backend connection, API key, and upload custom databases.
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-tertiary)' }}>
                Local Backend API URL
              </label>
              <input
                type="text"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                placeholder="http://localhost:8000"
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-tertiary)' }}>
                OpenAI API Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-..."
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: 'var(--text-tertiary)' }}>
                Upload Custom Database (.db / .sqlite)
              </label>
              <input
                type="file"
                accept=".db,.sqlite"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={uploading}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
              {uploading && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Uploading and indexing... {uploadProgress}%
                </div>
              )}
              {uploadSuccess && (
                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '8px' }}>
                  {uploadSuccess}
                </div>
              )}
              {uploadError && (
                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>
                  {uploadError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSettings(false)}
                className="qm-btn-secondary"
                style={{ padding: '8px 16px' }}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="qm-btn-primary"
                style={{ padding: '8px 16px' }}
                disabled={uploading}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
