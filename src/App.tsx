import { useState, useEffect } from 'react'
import { check } from '@tauri-apps/plugin-updater'

interface UpdateInfo {
  version: string
  body: string
  date: string
}

function App() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')

  const checkUpdate = async () => {
    setChecking(true)
    setMessage('Checking for updates...')
    try {
      const update = await check()
      if (update) {
        setUpdateInfo({
          version: update.version,
          body: update.body ?? '',
          date: update.date ?? '',
        })
        setMessage(`Update available: ${update.version}`)
      } else {
        setMessage('No updates available')
        setUpdateInfo(null)
      }
    } catch (err) {
      setMessage(`Error: ${err}`)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkUpdate()
  }, [])

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '32px', fontWeight: 600 }}>
        Just Design
      </h1>
      <p style={{ marginBottom: '24px', color: '#848484', lineHeight: 1.6 }}>
        Minimal Tauri v2 + React + TypeScript setup with updater plugin.
        This prototype tests the Tauri stack as an Electron alternative.
      </p>

      <div
        style={{
          padding: '16px',
          borderRadius: '8px',
          background: 'var(--bg-subtle, #ededed)',
          marginBottom: '24px',
        }}
      >
        <strong>Status:</strong> {message}
      </div>

      {updateInfo && (
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            background: 'var(--bg-panel, #fafafa)',
            border: '1px solid var(--border, #dbdbdb)',
          }}
        >
          <h3 style={{ marginBottom: '8px' }}>Update Details</h3>
          <p><strong>Version:</strong> {updateInfo.version}</p>
          <p><strong>Date:</strong> {updateInfo.date}</p>
          <p><strong>Notes:</strong> {updateInfo.body}</p>
        </div>
      )}

      <button
        onClick={checkUpdate}
        disabled={checking}
        style={{
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: 500,
          borderRadius: '8px',
          border: 'none',
          background: 'var(--accent, #353535)',
          color: 'var(--accent-contrast, #fafafa)',
          cursor: checking ? 'not-allowed' : 'pointer',
          opacity: checking ? 0.7 : 1,
        }}
      >
        {checking ? 'Checking...' : 'Check for Updates'}
      </button>

      <div style={{ marginTop: '32px', padding: '16px', fontSize: '13px', color: '#848484', lineHeight: 1.8 }}>
        <h4 style={{ marginBottom: '8px', color: '#202020' }}>Architecture Notes:</h4>
        <ul style={{ paddingLeft: '20px' }}>
          <li>Tauri v2 (Rust backend, WebView2 on Windows)</li>
          <li>~3-5 MB binary vs ~150 MB Electron</li>
          <li>Native updater via @tauri-apps/plugin-updater</li>
          <li>Uses system webview (no bundled Chromium)</li>
          <li>Sidecar commands would replace Electron IPC</li>
        </ul>
      </div>
    </div>
  )
}

export default App