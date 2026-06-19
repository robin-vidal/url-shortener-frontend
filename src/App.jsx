import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'

const API = import.meta.env.VITE_API_URL || ''

export default function App() {
  const canvasRef = useRef(null)
  const sceneRef = useRef({})
  const [inputUrl, setInputUrl] = useState('')
  const [urls, setUrls] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 3.2

    // Stars
    const starPos = new Float32Array(9000)
    for (let i = 0; i < 9000; i++) starPos[i] = (Math.random() - 0.5) * 300
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.9 })))

    // Planet with vertex colors
    const geo = new THREE.SphereGeometry(1, 128, 128)
    const posArr = geo.attributes.position.array
    const colors = new Float32Array(posArr.length)
    for (let i = 0; i < posArr.length; i += 3) {
      const x = posArr[i], y = posArr[i + 1], z = posArr[i + 2]
      const n1 = Math.sin(x * 4 + 1.2) * Math.cos(z * 4 + 0.8) * Math.sin(y * 3 + 0.5)
      const n2 = Math.sin(x * 8 - 0.7) * Math.cos(y * 6 + 1.1) * 0.5
      const v = n1 + n2
      const polar = Math.abs(y) > 0.75
      if (polar) { colors[i] = 0.92; colors[i+1] = 0.96; colors[i+2] = 1.0 }
      else if (v > 0.15) { colors[i] = 0.18 + v * 0.1; colors[i+1] = 0.55 + v * 0.1; colors[i+2] = 0.22 }
      else { colors[i] = 0.05 + Math.abs(v) * 0.1; colors[i+1] = 0.25 + Math.abs(v) * 0.2; colors[i+2] = 0.75 + Math.abs(v) * 0.1 }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const planet = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 60 }))
    scene.add(planet)

    // Atmosphere
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x3399ff, transparent: true, opacity: 0.07, side: THREE.FrontSide })
    ))

    // Glow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x4af0ff, transparent: true, opacity: 0.04, side: THREE.BackSide })
    ))

    // Lights
    const sun = new THREE.DirectionalLight(0xfff5d0, 2)
    sun.position.set(5, 3, 5)
    scene.add(sun)
    scene.add(new THREE.AmbientLight(0x0a0a2a, 2))

    let targetZ = 3.2, currentZ = 3.2
    let targetSpeed = 0.0015, currentSpeed = 0.0015

    sceneRef.current.zoom = (v) => {
      targetZ = v ? 1.5 : 3.2
      targetSpeed = v ? 0.008 : 0.0015
    }

    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      currentSpeed += (targetSpeed - currentSpeed) * 0.04
      currentZ += (targetZ - currentZ) * 0.035
      planet.rotation.y += currentSpeed
      planet.rotation.x += currentSpeed * 0.15
      camera.position.z = currentZ
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); renderer.dispose() }
  }, [])

  const fetchUrls = () => fetch(`${API}/urls`).then(r => r.json()).then(setUrls).catch(() => {})
  useEffect(() => { fetchUrls() }, [])

  const handleShorten = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    sceneRef.current.zoom?.(true)
    await new Promise(r => setTimeout(r, 1400))
    const res = await fetch(`${API}/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: inputUrl }),
    })
    sceneRef.current.zoom?.(false)
    setLoading(false)
    if (!res.ok) { setError('Failed to shorten URL'); return }
    setInputUrl('')
    fetchUrls()
  }

  const copy = code => {
    navigator.clipboard.writeText(`${window.location.origin}/r/${code}`)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <canvas ref={canvasRef} className="bg-canvas" />
      <div className="ui">
        <div className="panel">
          <header>
            <div className="logo">SHRTN</div>
            <p>Compress the world wide web</p>
          </header>

          <form onSubmit={handleShorten} className={loading ? 'form loading' : 'form'}>
            <input
              type="url"
              placeholder="https://your-long-url.com"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              required
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : '→'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          {urls.length > 0 && (
            <div className="links">
              {urls.map(u => (
                <div key={u.id} className="link-card">
                  <a className="short" href={`/r/${u.code}`} target="_blank" rel="noreferrer">
                    /r/{u.code}
                  </a>
                  <span className="original">{u.original}</span>
                  <div className="link-meta">
                    <span className="clicks">{u.clicks} clicks</span>
                    <button className="copy" onClick={() => copy(u.code)}>
                      {copied === u.code ? '✓' : 'copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
