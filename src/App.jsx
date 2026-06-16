import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [inputUrl, setInputUrl] = useState('')
  const [urls, setUrls] = useState([])
  const [error, setError] = useState('')

  const fetchUrls = () =>
    fetch(`${API}/urls`)
      .then(r => r.json())
      .then(setUrls)
      .catch(() => {})

  useEffect(() => { fetchUrls() }, [])

  const handleShorten = async e => {
    e.preventDefault()
    setError('')
    const res = await fetch(`${API}/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: inputUrl }),
    })
    if (!res.ok) {
      setError('Failed to shorten URL')
      return
    }
    setInputUrl('')
    fetchUrls()
  }

  return (
    <main>
      <h1>URL Shortener</h1>

      <form onSubmit={handleShorten}>
        <input
          type="url"
          placeholder="https://example.com"
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          required
        />
        <button type="submit">Shorten</button>
      </form>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Original URL</th>
            <th>Clicks</th>
          </tr>
        </thead>
        <tbody>
          {urls.map(u => (
            <tr key={u.id}>
              <td>
                <a href={`${API}/${u.code}`} target="_blank" rel="noreferrer">
                  {u.code}
                </a>
              </td>
              <td>{u.original}</td>
              <td>{u.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}

export default App
