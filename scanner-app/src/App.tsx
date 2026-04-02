import { useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import QRCode from 'qrcode'
import { supabase } from './lib/supabase'

type TabKey = 'scan' | 'history'

interface Student {
  id: string
  full_name: string
  student_id: string
  bus_no: number | null
  contact_no: string
  bus_stop: string
  fees_paid: boolean
  fees_paid_at: string | null
  image_url: string | null
}

interface ScanHistoryItem {
  scannedAt: string
  rawText: string
  student: Student
}

const HISTORY_KEY = 'scanner_history_v1'

const ensureCameraPermission = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API not supported on this device.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  stream.getTracks().forEach((track) => track.stop())
}

const pickPreferredCameraId = async () => {
  const cameras = await Html5Qrcode.getCameras()
  if (!cameras.length) {
    throw new Error('No camera detected on this device.')
  }

  const rear = cameras.filter((cam) => /back|rear|environment/i.test(cam.label))
  const rearNonWide = rear.filter((cam) => !/wide|ultra|macro|0\.5/i.test(cam.label))
  const nonFront = cameras.filter((cam) => !/front|selfie/i.test(cam.label))

  return rearNonWide[0]?.id ?? rear[0]?.id ?? nonFront[0]?.id ?? cameras[0].id
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

const formatDate = (iso: string | null) => {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  return d.toLocaleDateString()
}

const getDialHref = (contactNo: string) => {
  const cleaned = contactNo.replace(/[^\d+]/g, '')
  return `tel:${cleaned || contactNo}`
}

const parseStudentId = (rawText: string) => {
  const value = rawText.trim()
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed.student_id === 'string' && parsed.student_id.trim()) {
      return parsed.student_id.trim()
    }
  } catch {
    // not JSON payload
  }
  return value
}

const addHistoryItem = (items: ScanHistoryItem[], next: ScanHistoryItem) => {
  const deduped = items.filter(
    (item) => !(item.student.student_id === next.student.student_id && Math.abs(new Date(item.scannedAt).getTime() - new Date(next.scannedAt).getTime()) < 5000)
  )
  return [next, ...deduped].slice(0, 120)
}

const waitForImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

const buildVCardImage = async (student: Student) => {
  const payload = JSON.stringify({ type: 'bus_pass', student_id: student.student_id })
  const qrDataUrl = await QRCode.toDataURL(payload, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
  const qrImage = await waitForImage(qrDataUrl)

  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 1080
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas not supported')
  }

  const bg = ctx.createLinearGradient(0, 0, 720, 1080)
  bg.addColorStop(0, '#0f172a')
  bg.addColorStop(0.55, '#1e293b')
  bg.addColorStop(1, '#0b1220')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 720, 1080)

  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.strokeRect(18, 18, 684, 1044)

  ctx.fillStyle = '#99f6e4'
  ctx.font = '600 30px Segoe UI'
  ctx.fillText('BUS PASS MANAGEMENT', 46, 72)

  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 52px Segoe UI'
  ctx.fillText('Student Travel ID Card', 46, 136)

  const photoX = 48
  const photoY = 184
  const photoSize = 130
  const radius = 18

  ctx.fillStyle = '#1e293b'
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(photoX, photoY, photoSize, photoSize, radius)
  ctx.fill()
  ctx.stroke()

  if (student.image_url) {
    try {
      const profile = await waitForImage(student.image_url)
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(photoX, photoY, photoSize, photoSize, radius)
      ctx.clip()
      ctx.drawImage(profile, photoX, photoY, photoSize, photoSize)
      ctx.restore()
    } catch {
      // image fallback handled below
      ctx.fillStyle = '#cbd5e1'
      ctx.font = '700 64px Segoe UI'
      ctx.fillText((student.full_name.trim().charAt(0) || '?').toUpperCase(), photoX + 43, photoY + 86)
    }
  } else {
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '700 64px Segoe UI'
    ctx.fillText((student.full_name.trim().charAt(0) || '?').toUpperCase(), photoX + 43, photoY + 86)
  }

  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 48px Segoe UI'
  ctx.fillText(student.full_name.slice(0, 22), 200, 232)

  ctx.fillStyle = '#cbd5e1'
  ctx.font = '500 32px Segoe UI'
  ctx.fillText(`ID: ${student.student_id}`, 200, 286)
  ctx.fillText(`Bus No: ${student.bus_no ?? '-'}`, 200, 332)
  ctx.fillText(`Stop: ${student.bus_stop.slice(0, 26)}`, 200, 378)

  ctx.fillStyle = '#0b1935'
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(48, 470, 624, 430, 20)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(198, 530, 324, 324, 16)
  ctx.fill()

  ctx.drawImage(qrImage, 214, 546, 292, 292)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '500 34px Segoe UI'
  ctx.textAlign = 'center'
  ctx.fillText('Scan to verify student pass', 360, 980)

  return canvas.toDataURL('image/png')
}

function App() {
  const scannerId = 'scanner-region'
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
  const scanningRef = useRef(false)
  const processingScanRef = useRef(false)

  const [tab, setTab] = useState<TabKey | 'details'>('scan')
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanInfo, setScanInfo] = useState('Point camera to student QR')
  const [fetchingStudent, setFetchingStudent] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [history, setHistory] = useState<ScanHistoryItem[]>([])
  const [downloading, setDownloading] = useState(false)
  const [historyQuery, setHistoryQuery] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) {
      try {
        setHistory(JSON.parse(raw))
      } catch {
        setHistory([])
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }, [history])

  const openStudentByRawText = async (rawText: string) => {
    if (processingScanRef.current) return
    processingScanRef.current = true

    const studentId = parseStudentId(rawText)
    if (!studentId) {
      processingScanRef.current = false
      return
    }

    setFetchingStudent(true)
    setScanError(null)

    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, student_id, bus_no, contact_no, bus_stop, fees_paid, fees_paid_at, image_url')
      .eq('student_id', studentId)
      .single()

    try {
      setFetchingStudent(false)

      if (error || !data) {
        setScanError('Student not found for scanned QR')
        return
      }

      await stopScanner()
      setSelectedStudent(data)
      const scannedAt = new Date().toISOString()
      setHistory((prev) => addHistoryItem(prev, { scannedAt, rawText, student: data }))
      setScanInfo(`Scanned: ${data.full_name}`)
      setTab('details')
    } finally {
      processingScanRef.current = false
    }
  }

  const startScanner = async () => {
    if (html5QrcodeRef.current || scanningRef.current) return
    const regionEl = document.getElementById(scannerId)
    if (!regionEl) return

    const qr = new Html5Qrcode(scannerId)
    html5QrcodeRef.current = qr

    try {
      scanningRef.current = true
      await ensureCameraPermission()
      const preferredCameraId = await pickPreferredCameraId()
      await qr.start(
        preferredCameraId,
        { fps: 10, qrbox: { width: 230, height: 230 } },
        async (decodedText) => {
          await openStudentByRawText(decodedText)
        },
        () => {
          // ignore decode errors while scanning
        }
      )
      setScanInfo('Scanner running')
    } catch {
      setScanError('Camera permission denied or camera unavailable. Please allow camera access and try again.')
    }
  }

  const stopScanner = async () => {
    const qr = html5QrcodeRef.current
    html5QrcodeRef.current = null
    scanningRef.current = false

    if (!qr) return
    try {
      if (qr.isScanning) {
        await qr.stop()
      }
      await qr.clear()
    } catch {
      // ignore stop cleanup issues
    }
  }

  useEffect(() => {
    if (tab !== 'scan') {
      stopScanner()
      return
    }

    startScanner()
    return () => {
      stopScanner()
    }
  }, [tab])

  const downloadVCard = async (student: Student) => {
    setDownloading(true)
    try {
      const dataUrl = await buildVCardImage(student)
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${student.student_id}_vcard.png`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase()
    if (!q) return history
    return history.filter((item) => {
      const s = item.student
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        String(s.bus_no ?? '').toLowerCase().includes(q) ||
        s.bus_stop.toLowerCase().includes(q)
      )
    })
  }, [history, historyQuery])

  const historyCountText = useMemo(() => `${history.length} scan records`, [history.length])

  const openStudentFromHistory = (item: ScanHistoryItem) => {
    setSelectedStudent(item.student)
    setScanInfo(`Viewed: ${item.student.full_name}`)
    setTab('details')
  }

  const clearHistory = () => {
    setHistory([])
    setHistoryQuery('')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Dhanlaxmi Bus Pass</h1>
          <p className="topbar-subtitle">{tab === 'scan' ? scanInfo : tab === 'history' ? historyCountText : 'Student details'}</p>
        </div>
        <span className="topbar-pill">Live</span>
      </header>

      <main className="content">
        {tab === 'scan' ? (
          <section className="panel">
            <div className="section-head">
              <h2>Scan QR</h2>
              <p>Point the camera at student pass QR code.</p>
            </div>
            <div className="scanner-shell">
              <div id={scannerId} className="scanner-box" />
            </div>
            {scanError ? <div className="error">{scanError}</div> : null}
            {fetchingStudent ? <p className="muted">Fetching student...</p> : null}

            <div className="hint-card">After a successful scan, the full student profile opens automatically.</div>
          </section>
        ) : tab === 'history' ? (
          <section className="panel history-panel">
            <div className="section-head">
              <h2>Scan History</h2>
              <p>Search and open any previously scanned student record.</p>
            </div>
            <div className="history-toolbar">
              <input
                placeholder="Search by name, student ID, stop, bus no"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
              />
              <button className="ghost danger" onClick={clearHistory} disabled={history.length === 0}>Clear</button>
            </div>
            {filteredHistory.length === 0 ? <div className="empty-card">No matching history records.</div> : null}
            {filteredHistory.map((item, idx) => (
              <button key={`${item.student.id}-${item.scannedAt}-${idx}`} className="history-item" onClick={() => openStudentFromHistory(item)}>
                <div className="history-avatar">{(item.student.full_name.charAt(0) || '?').toUpperCase()}</div>
                <div className="history-main">
                  <div className="history-title-row">
                    <h4>{item.student.full_name}</h4>
                    <span className="history-time">{formatDateTime(item.scannedAt)}</span>
                  </div>
                  <p>ID: {item.student.student_id}</p>
                  <p>Bus: {item.student.bus_no ?? '-'} | Stop: {item.student.bus_stop}</p>
                  <span className={item.student.fees_paid ? 'badge-paid' : 'badge-unpaid'}>
                    {item.student.fees_paid ? 'Fees Paid' : 'Fees Unpaid'}
                  </span>
                </div>
              </button>
            ))}
          </section>
        ) : selectedStudent ? (
          <section className="panel details-panel">
            <div className="student-hero">
              {selectedStudent.image_url ? (
                <img src={selectedStudent.image_url} alt={selectedStudent.full_name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <div className="avatar large">{(selectedStudent.full_name.charAt(0) || '?').toUpperCase()}</div>
              )}
              <div>
                <h2>{selectedStudent.full_name}</h2>
                <p>Student ID: {selectedStudent.student_id}</p>
                <p>Contact: {selectedStudent.contact_no}</p>
                <span className={selectedStudent.fees_paid ? 'badge-paid' : 'badge-unpaid'}>
                  {selectedStudent.fees_paid ? 'Fees Paid' : 'Fees Unpaid'}
                </span>
              </div>
            </div>

            <div className="details-grid">
              <div className="detail-row"><strong>Bus Number</strong><span>{selectedStudent.bus_no ?? '-'}</span></div>
              <div className="detail-row"><strong>Bus Stop</strong><span>{selectedStudent.bus_stop}</span></div>
              <div className="detail-row"><strong>Fees Status</strong><span>{selectedStudent.fees_paid ? 'Paid' : 'Unpaid'}</span></div>
              <div className="detail-row"><strong>Fees Paid Date</strong><span>{formatDate(selectedStudent.fees_paid_at)}</span></div>
            </div>

            <div className="details-actions">
              <button className="ghost" onClick={() => setTab('scan')}>Scan Next</button>
              <a
                className="action-link icon-only"
                href={getDialHref(selectedStudent.contact_no)}
                aria-label={`Call ${selectedStudent.contact_no}`}
                title={`Call ${selectedStudent.contact_no}`}
              >
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.08.36 2.24.56 3.42.56a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.73 21 3 13.27 3 3.8a1 1 0 0 1 1-1H7.5a1 1 0 0 1 1 1c0 1.18.2 2.34.56 3.42a1 1 0 0 1-.24 1l-2.22 2.58z" />
                </svg>
              </a>
              <button onClick={() => downloadVCard(selectedStudent)} disabled={downloading}>
                {downloading ? 'Preparing image...' : 'Download V Card Image'}
              </button>
            </div>
          </section>
        ) : (
          <section className="panel">
            <div className="empty-card">No student selected yet.</div>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={tab === 'scan' || tab === 'details' ? 'active' : ''} onClick={() => setTab('scan')}>Scan</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>History</button>
      </nav>
    </div>
  )
}

export default App
