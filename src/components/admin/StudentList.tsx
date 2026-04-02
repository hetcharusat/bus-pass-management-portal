import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, AlertCircle, Search, Pencil, X, RotateCcw, QrCode, Download, Printer } from 'lucide-react'
import QRCode from 'qrcode'
import JSZip from 'jszip'

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
  created_at: string
}

interface StudentListProps {
  refreshTrigger?: boolean
}

interface VCardDesign {
  photoX: number
  photoY: number
  photoSize: number
  photoRadius: number
  qrSize: number
  qrY: number
}

interface VCardTheme {
  titleTop: string
  titleMain: string
  footerText: string
  idLabel: string
  busNoLabel: string
  stopLabel: string
  titleTopColor: string
  titleMainColor: string
  bodyTextColor: string
  footerColor: string
  nameTextSize: number
  infoTextSize: number
  footerTextSize: number
  backgroundImageUrl: string
  backgroundOpacity: number
  backgroundBlur: number
}

type CanvasDragTarget = 'photo' | 'qr' | null

export const StudentList: React.FC<StudentListProps> = ({ refreshTrigger }) => {
  const PAGE_SIZE = 30
  const VCARD_SETTINGS_ID = '11111111-1111-1111-1111-111111111111'
  const defaultVCardDesign: VCardDesign = {
    photoX: 56,
    photoY: 164,
    photoSize: 112,
    photoRadius: 20,
    qrSize: 200,
    qrY: 414,
  }
  const defaultVCardTheme: VCardTheme = {
    titleTop: 'BUS PASS MANAGEMENT',
    titleMain: 'Student Travel ID Card',
    footerText: 'Scan to verify student pass',
    idLabel: 'ID',
    busNoLabel: 'Bus No',
    stopLabel: 'Stop',
    titleTopColor: '#99f6e4',
    titleMainColor: '#f8fafc',
    bodyTextColor: '#cbd5e1',
    footerColor: '#94a3b8',
    nameTextSize: 44,
    infoTextSize: 30,
    footerTextSize: 38,
    backgroundImageUrl: '',
    backgroundOpacity: 0.35,
    backgroundBlur: 0,
  }
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [globalQuery, setGlobalQuery] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [idFilter, setIdFilter] = useState('')
  const [busNoFilter, setBusNoFilter] = useState('')
  const [busStopFilter, setBusStopFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [qrStudent, setQrStudent] = useState<Student | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string>('')
  const [qrLoading, setQrLoading] = useState(false)
  const [vCardPreviewUrl, setVCardPreviewUrl] = useState('')
  const [vCardPreviewLoading, setVCardPreviewLoading] = useState(false)
  const [cardDesign, setCardDesign] = useState<VCardDesign>(defaultVCardDesign)
  const [cardTheme, setCardTheme] = useState<VCardTheme>(defaultVCardTheme)
  const [canvasPhotoLoadFailed, setCanvasPhotoLoadFailed] = useState(false)
  const [canvasDesignerOpen, setCanvasDesignerOpen] = useState(false)
  const [canvasDragTarget, setCanvasDragTarget] = useState<CanvasDragTarget>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [backgroundUploading, setBackgroundUploading] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [zipStatus, setZipStatus] = useState({
    active: false,
    phase: '',
    current: 0,
    total: 0,
    percent: 0,
  })
  const [editForm, setEditForm] = useState({
    full_name: '',
    student_id: '',
    bus_no: '',
    contact_no: '',
    bus_stop: '',
    fees_paid: false,
    fees_paid_at: '',
  })
  const stageRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    target: Exclude<CanvasDragTarget, null>
    startX: number
    startY: number
    startDesign: VCardDesign
    stageWidth: number
    stageHeight: number
  } | null>(null)

  const clampCardDesign = (design: VCardDesign): VCardDesign => ({
    photoX: Math.max(40, Math.min(130, Math.round(design.photoX))),
    photoY: Math.max(150, Math.min(210, Math.round(design.photoY))),
    photoSize: Math.max(84, Math.min(160, Math.round(design.photoSize))),
    photoRadius: Math.max(8, Math.min(28, Math.round(design.photoRadius))),
    qrSize: Math.max(170, Math.min(240, Math.round(design.qrSize))),
    qrY: Math.max(390, Math.min(430, Math.round(design.qrY))),
  })

  const clampCardTheme = (theme: VCardTheme): VCardTheme => ({
    ...theme,
    nameTextSize: Math.max(28, Math.min(82, Math.round(theme.nameTextSize))),
    infoTextSize: Math.max(16, Math.min(58, Math.round(theme.infoTextSize))),
    footerTextSize: Math.max(20, Math.min(68, Math.round(theme.footerTextSize))),
    backgroundOpacity: Math.max(0, Math.min(1, Number(theme.backgroundOpacity.toFixed(2)))),
    backgroundBlur: Math.max(0, Math.min(14, Math.round(theme.backgroundBlur))),
  })

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchStudents(true)
    }, 220)

    return () => clearTimeout(debounce)
  }, [refreshTrigger, globalQuery, nameFilter, idFilter, busNoFilter, busStopFilter, statusFilter])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('vcard_design_v1')
      if (!raw) return

      const parsed = JSON.parse(raw) as { design?: Partial<VCardDesign>; theme?: Partial<VCardTheme> }
      if (parsed.design) {
        setCardDesign((prev) => clampCardDesign({ ...prev, ...parsed.design }))
      }
      if (parsed.theme) {
        setCardTheme((prev) => clampCardTheme({ ...prev, ...parsed.theme }))
      }
    } catch {
      // keep defaults when saved design is invalid
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'vcard_design_v1',
      JSON.stringify({
        design: cardDesign,
        theme: cardTheme,
      })
    )
  }, [cardDesign, cardTheme])

  useEffect(() => {
    const loadGlobalSettings = async () => {
      const { data, error: fetchError } = await supabase.from('vcard_settings').select('config').eq('id', VCARD_SETTINGS_ID).maybeSingle()

      if (fetchError || !data?.config) return

      const config = data.config as { design?: Partial<VCardDesign>; theme?: Partial<VCardTheme> }
      if (config.design) {
        setCardDesign((prev) => clampCardDesign({ ...prev, ...config.design }))
      }
      if (config.theme) {
        setCardTheme((prev) => clampCardTheme({ ...prev, ...config.theme }))
      }
    }

    loadGlobalSettings()
  }, [])

  const saveGlobalSettings = async () => {
    setSettingsSaving(true)
    setSettingsMessage('')

    try {
      const payload = {
        id: VCARD_SETTINGS_ID,
        config: {
          design: cardDesign,
          theme: cardTheme,
        },
        updated_at: new Date().toISOString(),
      }

      const { error: saveError } = await supabase.from('vcard_settings').upsert(payload)
      if (saveError) throw saveError
      setSettingsMessage('Saved to cloud')
    } catch {
      setSettingsMessage('Save failed')
    } finally {
      setSettingsSaving(false)
      setTimeout(() => setSettingsMessage(''), 1800)
    }
  }

  const uploadBackgroundImage = async (file: File) => {
    setBackgroundUploading(true)
    setSettingsMessage('')

    try {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const path = `global/background-${Date.now()}-${safeFileName}`
      const { error: uploadError } = await supabase.storage.from('vcard-assets').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('vcard-assets').getPublicUrl(path)
      const nextTheme = clampCardTheme({ ...cardTheme, backgroundImageUrl: data.publicUrl })
      setCardTheme(nextTheme)

      await supabase.from('vcard_settings').upsert({
        id: VCARD_SETTINGS_ID,
        config: {
          design: cardDesign,
          theme: nextTheme,
        },
        updated_at: new Date().toISOString(),
      })

      setSettingsMessage('Background uploaded')
    } catch {
      setSettingsMessage('Background upload failed')
    } finally {
      setBackgroundUploading(false)
      setTimeout(() => setSettingsMessage(''), 1800)
    }
  }

  useEffect(() => {
    if (!canvasDesignerOpen || !canvasDragTarget) return

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const scaleX = 640 / drag.stageWidth
      const scaleY = 760 / drag.stageHeight
      const dx = (event.clientX - drag.startX) * scaleX
      const dy = (event.clientY - drag.startY) * scaleY

      if (drag.target === 'photo') {
        setCardDesign(
          clampCardDesign({
            ...drag.startDesign,
            photoX: drag.startDesign.photoX + dx,
            photoY: drag.startDesign.photoY + dy,
          })
        )
      }

      if (drag.target === 'qr') {
        setCardDesign(
          clampCardDesign({
            ...drag.startDesign,
            qrY: drag.startDesign.qrY + dy,
          })
        )
      }
    }

    const onUp = () => {
      setCanvasDragTarget(null)
      dragRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [canvasDesignerOpen, canvasDragTarget])

  const startCanvasDrag = (target: Exclude<CanvasDragTarget, null>, event: React.PointerEvent) => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()

    dragRef.current = {
      target,
      startX: event.clientX,
      startY: event.clientY,
      startDesign: { ...cardDesign },
      stageWidth: rect.width,
      stageHeight: rect.height,
    }

    setCanvasDragTarget(target)
    event.preventDefault()
  }

  const fetchStudents = async (reset = false) => {
    const nextPage = reset ? 0 : page

    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    setError(null)

    try {
      const from = nextPage * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('students')
        .select('id, full_name, student_id, bus_no, contact_no, bus_stop, fees_paid, fees_paid_at, image_url, created_at')
        .order('created_at', { ascending: false })
        .range(from, to)

      const safeGlobal = globalQuery.trim().replaceAll(',', '').replaceAll('%', '')
      if (safeGlobal.length > 0) {
        query = query.or(
          `full_name.ilike.%${safeGlobal}%,student_id.ilike.%${safeGlobal}%,contact_no.ilike.%${safeGlobal}%,bus_stop.ilike.%${safeGlobal}%`
        )
      }

      if (nameFilter.trim()) {
        query = query.ilike('full_name', `%${nameFilter.trim()}%`)
      }

      if (idFilter.trim()) {
        query = query.ilike('student_id', `%${idFilter.trim()}%`)
      }

      if (busStopFilter.trim()) {
        query = query.ilike('bus_stop', `%${busStopFilter.trim()}%`)
      }

      if (busNoFilter.trim() && !Number.isNaN(Number(busNoFilter))) {
        query = query.eq('bus_no', Number(busNoFilter))
      }

      if (statusFilter === 'paid') {
        query = query.eq('fees_paid', true)
      }

      if (statusFilter === 'unpaid') {
        query = query.eq('fees_paid', false)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      const rows = data || []

      if (reset) {
        setStudents(rows)
        setPage(1)
      } else {
        setStudents((prev) => [...prev, ...rows])
        setPage((prev) => prev + 1)
      }

      setHasMore(rows.length === PAGE_SIZE)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch students')
    } finally {
      if (reset) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
    }
  }

  const resetFilters = () => {
    setGlobalQuery('')
    setNameFilter('')
    setIdFilter('')
    setBusNoFilter('')
    setBusStopFilter('')
    setStatusFilter('all')
  }

  const deleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    setDeleting(id)

    try {
      const { error: deleteError } = await supabase.from('students').delete().eq('id', id)

      if (deleteError) throw deleteError

      setStudents((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete student')
    } finally {
      setDeleting(null)
    }
  }

  const openEditModal = (student: Student) => {
    setEditingStudent(student)
    setEditForm({
      full_name: student.full_name,
      student_id: student.student_id,
      bus_no: student.bus_no ? String(student.bus_no) : '',
      contact_no: student.contact_no,
      bus_stop: student.bus_stop,
      fees_paid: student.fees_paid,
      fees_paid_at: student.fees_paid_at || '',
    })
  }

  const closeEditModal = () => {
    setEditingStudent(null)
  }

  const sanitizeForHtml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

  const dataUrlToBase64 = (dataUrl: string) => {
    const parts = dataUrl.split(',')
    return parts.length > 1 ? parts[1] : ''
  }

  const truncateForCard = (value: string, maxLength: number) => (value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value)

  const loadRemoteImageAsDataUrl = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      const blob = await response.blob()

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result || ''))
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  const buildVCardSvg = (student: Student, qrDataUrl: string, photoDataUrl: string | null) => {
    const design = clampCardDesign(cardDesign)
    const theme = clampCardTheme(cardTheme)
    const photoX = design.photoX
    const photoY = design.photoY
    const photoSize = design.photoSize
    const photoRadius = design.photoRadius
    const qrSize = design.qrSize
    const qrY = design.qrY
    const textX = photoX + photoSize + 18

    const safeTopTitle = sanitizeForHtml(truncateForCard(theme.titleTop, 34))
    const safeMainTitle = sanitizeForHtml(truncateForCard(theme.titleMain, 30))
    const safeFooter = sanitizeForHtml(truncateForCard(theme.footerText, 40))
    const safeIdLabel = sanitizeForHtml(truncateForCard(theme.idLabel, 16))
    const safeBusLabel = sanitizeForHtml(truncateForCard(theme.busNoLabel, 16))
    const safeStopLabel = sanitizeForHtml(truncateForCard(theme.stopLabel, 16))
    const safeName = sanitizeForHtml(truncateForCard(student.full_name, 24))
    const safeStudentId = sanitizeForHtml(student.student_id)
    const safeBusStop = sanitizeForHtml(truncateForCard(student.bus_stop, 28))
    const safeBusNo = sanitizeForHtml(String(student.bus_no ?? '-'))
    const safeInitial = sanitizeForHtml(truncateForCard(student.full_name, 1).toUpperCase())
    const photoMarkup = photoDataUrl
      ? `<image href="${photoDataUrl}" x="${photoX}" y="${photoY}" width="${photoSize}" height="${photoSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)" />`
      : `<text x="${photoX + photoSize / 2}" y="${photoY + photoSize / 2 + 16}" text-anchor="middle" font-size="44" font-weight="700" fill="#cbd5e1">${safeInitial}</text>`

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="640" height="760" viewBox="0 0 640 760">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="60%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#0b1220" />
          </linearGradient>
          <radialGradient id="aura" cx="1" cy="0" r="0.62">
            <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.45" />
            <stop offset="100%" stop-color="#14b8a6" stop-opacity="0" />
          </radialGradient>
          <filter id="bgBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="${theme.backgroundBlur}" />
          </filter>
          <clipPath id="photoClip">
            <rect x="${photoX}" y="${photoY}" width="${photoSize}" height="${photoSize}" rx="${photoRadius}" ry="${photoRadius}" />
          </clipPath>
        </defs>

        <rect x="0" y="0" width="640" height="760" rx="36" fill="url(#bg)" />
        ${theme.backgroundImageUrl ? `<image href="${theme.backgroundImageUrl}" x="0" y="0" width="640" height="760" preserveAspectRatio="xMidYMid slice" opacity="${theme.backgroundOpacity}" filter="url(#bgBlur)" />` : ''}
        <rect x="0" y="0" width="640" height="188" fill="url(#aura)" />
        <rect x="1" y="1" width="638" height="758" rx="36" fill="none" stroke="#334155" stroke-width="2" />
        <line x1="0" y1="136" x2="640" y2="136" stroke="#334155" stroke-width="2" />

        <text x="32" y="46" fill="${theme.titleTopColor}" font-size="22" letter-spacing="2">${safeTopTitle}</text>
        <text x="32" y="95" fill="${theme.titleMainColor}" font-size="46" font-weight="700">${safeMainTitle}</text>

        <rect x="${photoX}" y="${photoY}" width="${photoSize}" height="${photoSize}" rx="${photoRadius}" fill="#1e293b" stroke="#475569" stroke-width="2" />
        ${photoMarkup}

        <text x="${textX}" y="${photoY + 26}" fill="${theme.titleMainColor}" font-size="${theme.nameTextSize}" font-weight="700">${safeName}</text>
        <text x="${textX}" y="${photoY + 68}" fill="${theme.bodyTextColor}" font-size="${theme.infoTextSize}">${safeIdLabel}: ${safeStudentId}</text>
        <text x="${textX}" y="${photoY + 104}" fill="${theme.bodyTextColor}" font-size="${theme.infoTextSize}">${safeBusLabel}: ${safeBusNo}</text>
        <text x="${textX}" y="${photoY + 140}" fill="${theme.bodyTextColor}" font-size="${theme.infoTextSize}">${safeStopLabel}: ${safeBusStop}</text>

        <rect x="32" y="368" width="576" height="292" rx="22" fill="#0b1935" stroke="#334155" stroke-width="2" />
        <rect x="${320 - qrSize / 2 - 12}" y="${qrY - 12}" width="${qrSize + 24}" height="${qrSize + 24}" rx="18" fill="#ffffff" />
        <image href="${qrDataUrl}" x="${320 - qrSize / 2}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet" />

        <text x="320" y="716" text-anchor="middle" fill="${theme.footerColor}" font-size="${theme.footerTextSize}">${safeFooter}</text>
      </svg>
    `
  }

  const svgToPngDataUrl = (svg: string, width: number, height: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Canvas context unavailable'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/png'))
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Unable to render card image'))
      }

      img.src = url
    })

  const getQrPayload = (student: Student) =>
    JSON.stringify({
      type: 'bus_pass',
      student_id: student.student_id,
    })

  const generateQrDataUrl = async (student: Student, width = 320) =>
    QRCode.toDataURL(getQrPayload(student), {
      margin: 1,
      width,
      errorCorrectionLevel: 'M',
    })

  const generateVCardPngDataUrl = async (student: Student, qrDataUrl: string) => {
    const profileDataUrl = student.image_url ? await loadRemoteImageAsDataUrl(student.image_url) : null
    const svg = buildVCardSvg(student, qrDataUrl, profileDataUrl)
    return svgToPngDataUrl(svg, 640, 760)
  }

  useEffect(() => {
    let cancelled = false

    const generatePreview = async () => {
      if (!qrStudent || !qrImageUrl) {
        setVCardPreviewUrl('')
        return
      }

      setVCardPreviewLoading(true)
      try {
        const preview = await generateVCardPngDataUrl(qrStudent, qrImageUrl)
        if (!cancelled) {
          setVCardPreviewUrl(preview)
        }
      } catch {
        if (!cancelled) {
          setVCardPreviewUrl('')
        }
      } finally {
        if (!cancelled) {
          setVCardPreviewLoading(false)
        }
      }
    }

    const timer = setTimeout(generatePreview, 120)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [qrStudent, qrImageUrl, cardDesign])

  const openQrModal = async (student: Student) => {
    setQrStudent(student)
    setQrImageUrl('')
    setVCardPreviewUrl('')
    setCanvasPhotoLoadFailed(false)
    setQrLoading(true)

    try {
      const dataUrl = await generateQrDataUrl(student, 320)

      setQrImageUrl(dataUrl)
    } catch {
      setError('Unable to generate QR right now')
      setQrStudent(null)
    } finally {
      setQrLoading(false)
    }
  }

  const closeQrModal = () => {
    setQrStudent(null)
    setQrImageUrl('')
    setVCardPreviewUrl('')
    setCanvasDesignerOpen(false)
    setCanvasDragTarget(null)
    dragRef.current = null
    setQrLoading(false)
  }

  const downloadQrImage = () => {
    if (!qrImageUrl || !qrStudent) return

    const link = document.createElement('a')
    link.href = qrImageUrl
    link.download = `${qrStudent.student_id}_qr.png`
    link.click()
  }

  const downloadVCardImage = async () => {
    if (!qrStudent || !qrImageUrl || qrLoading || bulkBusy) return

    setBulkBusy(true)
    setError(null)

    try {
      const vCardDataUrl = vCardPreviewUrl || (await generateVCardPngDataUrl(qrStudent, qrImageUrl))
      const link = document.createElement('a')
      link.href = vCardDataUrl
      link.download = `${qrStudent.student_id}_vcard.png`
      link.click()
    } catch {
      setError('Unable to export V card image')
    } finally {
      setBulkBusy(false)
    }
  }

  const printVCard = async () => {
    if (!qrStudent || !qrImageUrl) return

    setBulkBusy(true)
    setError(null)

    try {
      let printableImage = vCardPreviewUrl
      if (!printableImage) {
        printableImage = await generateVCardPngDataUrl(qrStudent, qrImageUrl)
      }

      const cardHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${qrStudent.student_id}_vcard</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            display: grid;
            place-items: center;
            min-height: 100vh;
            background: #0b1220;
            padding: 16px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .card-img {
            width: 320px;
            max-width: 92vw;
            border-radius: 18px;
            border: 1px solid #334155;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
          }
          @media print {
            body { background: #ffffff; padding: 0; min-height: auto; }
            .card-img { box-shadow: none; border: 1px solid #cbd5e1; }
          }
        </style>
      </head>
      <body>
        <img class="card-img" src="${printableImage}" alt="V Card" />
        <script>
          window.onload = function () {
            setTimeout(function () { window.print(); }, 120);
          };
        </script>
      </body>
      </html>
    `

      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) {
        setError('Please allow popups to print this V card')
        return
      }

      printWindow.document.open()
      printWindow.document.write(cardHtml)
      printWindow.document.close()
    } catch {
      setError('Unable to prepare V card for print')
    } finally {
      setBulkBusy(false)
    }
  }

  const printBulkVCards = async () => {
    if (students.length === 0 || bulkBusy) return
    setBulkBusy(true)
    setError(null)

    try {
      const cardImages = await Promise.all(
        students.map(async (student) => {
          const qrDataUrl = await generateQrDataUrl(student, 320)
          return generateVCardPngDataUrl(student, qrDataUrl)
        })
      )

      const printWindow = window.open('', '_blank', 'width=1100,height=780')
      if (!printWindow) {
        setError('Please allow popups to print in bulk')
        return
      }

      const imageHtml = cardImages
        .map(
          (img) => `<div style="break-inside: avoid; display:flex; justify-content:center;"><img src="${img}" style="width:320px; border-radius:16px; border:1px solid #cbd5e1;" /></div>`
        )
        .join('')

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>bulk_vcards_${new Date().toISOString().slice(0, 10)}</title>
          <style>
            body { margin: 0; padding: 12px; background: #fff; }
            .sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 10px; }
            @media print {
              @page { margin: 10mm; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <section class="sheet">${imageHtml}</section>
          <script>
            window.onload = function () { setTimeout(function () { window.print(); }, 120); };
          </script>
        </body>
        </html>
      `
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
    } catch {
      setError('Unable to generate bulk V cards right now')
    } finally {
      setBulkBusy(false)
    }
  }

  const downloadBulkVCardZip = async () => {
    if (students.length === 0 || bulkBusy) return
    if (!confirm(`Create ZIP for ${students.length} V card images with ID-based file names?`)) return

    setBulkBusy(true)
    setError(null)
    setZipStatus({
      active: true,
      phase: 'Preparing card images',
      current: 0,
      total: students.length,
      percent: 0,
    })

    try {
      const zip = new JSZip()

      for (let i = 0; i < students.length; i += 1) {
        const student = students[i]
        setZipStatus({
          active: true,
          phase: 'Preparing card images',
          current: i + 1,
          total: students.length,
          percent: Math.round(((i + 1) / students.length) * 90),
        })

        const qrDataUrl = await generateQrDataUrl(student, 320)
        const vCardDataUrl = await generateVCardPngDataUrl(student, qrDataUrl)
        zip.file(`${student.student_id}_vcard.png`, dataUrlToBase64(vCardDataUrl), { base64: true })
      }

      setZipStatus({
        active: true,
        phase: 'Zipping files',
        current: students.length,
        total: students.length,
        percent: 95,
      })

      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
          setZipStatus({
            active: true,
            phase: 'Zipping files',
            current: students.length,
            total: students.length,
            percent: Math.max(95, Math.min(100, Math.round(metadata.percent))),
          })
        }
      )

      const zipName = `v_cards_${new Date().toISOString().slice(0, 10)}.zip`
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = zipName
      link.click()
      URL.revokeObjectURL(link.href)

      setZipStatus({
        active: true,
        phase: 'Done',
        current: students.length,
        total: students.length,
        percent: 100,
      })
    } catch {
      setError('Bulk ZIP creation failed. Please try again.')
    } finally {
      setTimeout(() => {
        setZipStatus({ active: false, phase: '', current: 0, total: 0, percent: 0 })
      }, 900)
      setBulkBusy(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return

    setSavingEdit(true)
    setError(null)

    try {
      const updatePayload = {
        full_name: editForm.full_name,
        student_id: editForm.student_id,
        bus_no: editForm.bus_no ? Number(editForm.bus_no) : null,
        contact_no: editForm.contact_no,
        bus_stop: editForm.bus_stop,
        fees_paid: editForm.fees_paid,
        fees_paid_at: editForm.fees_paid ? (editForm.fees_paid_at || null) : null,
      }

      const { data, error: updateError } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('id', editingStudent.id)
        .select('id, full_name, student_id, bus_no, contact_no, bus_stop, fees_paid, fees_paid_at, image_url, created_at')
        .single()

      if (updateError) throw updateError

      setStudents((prev) => prev.map((student) => (student.id === editingStudent.id ? data : student)))
      closeEditModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update student')
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="mb-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            placeholder="Quick search: name, ID, phone, bus stop"
            className="spotlight-field w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-100 pl-9 pr-3 py-2.5 text-sm outline-none"
          />
        </div>
        <div className="inline-flex rounded-xl border border-slate-700 bg-slate-800/90 p-1 gap-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 min-w-[72px] rounded-lg text-sm font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.45)]'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 min-w-[72px] rounded-lg text-sm font-semibold transition-colors ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.45)]'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3 py-1.5 min-w-[72px] rounded-lg text-sm font-semibold transition-colors ${
              statusFilter === 'unpaid'
                ? 'bg-emerald-600 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.45)]'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            Unpaid
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder="Filter: Full Name"
          className="spotlight-field px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg text-sm outline-none"
        />
        <input
          value={idFilter}
          onChange={(e) => setIdFilter(e.target.value)}
          placeholder="Filter: Student ID"
          className="spotlight-field px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg text-sm outline-none"
        />
        <input
          value={busNoFilter}
          onChange={(e) => setBusNoFilter(e.target.value)}
          placeholder="Filter: Bus No"
          className="spotlight-field px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg text-sm outline-none"
        />
        <input
          value={busStopFilter}
          onChange={(e) => setBusStopFilter(e.target.value)}
          placeholder="Filter: Bus Stop"
          className="spotlight-field px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg text-sm outline-none"
        />
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {students.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={printBulkVCards}
            disabled={bulkBusy}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> {bulkBusy ? 'Preparing...' : 'Bulk Print V Cards'}
          </button>
          <button
            type="button"
            onClick={downloadBulkVCardZip}
            disabled={bulkBusy}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Bulk Download Images (ZIP)
          </button>
          <span className="text-xs text-slate-400">Uses currently loaded/filtered students.</span>
        </div>
      ) : null}

      {zipStatus.active ? (
        <div className="mb-4 rounded-lg border border-emerald-700/40 bg-emerald-950/20 px-3 py-2">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span>{zipStatus.phase}</span>
            <span>{zipStatus.current}/{zipStatus.total}</span>
          </div>
          <div className="mt-2 h-2 w-full rounded bg-slate-800 overflow-hidden">
            <div className="h-2 bg-emerald-500 transition-all duration-150" style={{ width: `${zipStatus.percent}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-emerald-200">{zipStatus.percent}%</p>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 pretty-scrollbar">
      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 py-12 px-6 text-center">
          <p className="text-slate-300 text-lg font-medium">No students found</p>
          <p className="text-slate-500 text-sm mt-1">Try changing filters or refresh the list.</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <RotateCcw className="w-4 h-4" /> Reset Filters
            </button>
            <button
              type="button"
              onClick={() => fetchStudents(true)}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : null}

      {students.length > 0 ? (
      <div className="hidden lg:block overflow-x-auto pretty-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800 border-y border-slate-700">
              <th className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase text-slate-400 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80">Photo</th>
              <th className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase text-slate-400 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80">Full Name</th>
              <th className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase text-slate-400 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80">Student ID</th>
              <th className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase text-slate-400 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80">Bus No</th>
              <th className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase text-slate-400 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80">Contact</th>
              <th className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase text-slate-400 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80">Bus Stop</th>
              <th className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase text-slate-400 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80">Fees</th>
              <th className="sticky top-0 z-20 px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase text-slate-400 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80">Paid On</th>
              <th className="sticky top-0 z-20 px-4 py-3 text-center text-xs font-semibold tracking-wide uppercase text-slate-400 bg-slate-800/95 backdrop-blur supports-[backdrop-filter]:bg-slate-800/80">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-800/60 transition">
                <td className="px-4 py-3">
                  {student.image_url ? (
                    <img src={student.image_url} alt={student.full_name} loading="lazy" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-lg">
                      {student.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-100 font-medium">{student.full_name}</td>
                <td className="px-4 py-3 text-slate-300">{student.student_id}</td>
                <td className="px-4 py-3 text-slate-300">{student.bus_no ?? '-'}</td>
                <td className="px-4 py-3 text-slate-300">{student.contact_no}</td>
                <td className="px-4 py-3 text-slate-300">{student.bus_stop}</td>
                <td className="px-4 py-3">
                  {student.fees_paid ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">PAID</span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">UNPAID</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300 text-sm">
                  {student.fees_paid_at ? new Date(student.fees_paid_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex items-center gap-3">
                    <button onClick={() => openQrModal(student)} className="text-emerald-400 hover:text-emerald-300 transition" title="Open ID / QR">
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditModal(student)} className="text-blue-400 hover:text-blue-300 transition" title="Edit student">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteStudent(student.id)}
                      disabled={deleting === student.id}
                      className="text-red-400 hover:text-red-300 disabled:text-gray-500 transition"
                      title="Delete student"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : null}

      {students.length > 0 ? (
        <div className="lg:hidden space-y-3">
          {students.map((student) => (
            <div key={student.id} className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
              <div className="flex items-start gap-3">
                {student.image_url ? (
                  <img src={student.image_url} alt={student.full_name} loading="lazy" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-lg">
                    {student.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-semibold truncate">{student.full_name}</p>
                  <p className="text-slate-400 text-xs">ID: {student.student_id}</p>
                  <p className="text-slate-400 text-xs">Bus No: {student.bus_no ?? '-'}</p>
                  <p className="text-slate-400 text-xs truncate">Stop: {student.bus_stop}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${student.fees_paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {student.fees_paid ? 'PAID' : 'UNPAID'}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openQrModal(student)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold"
                >
                  <QrCode className="w-3.5 h-3.5" /> ID/QR
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(student)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-600 text-slate-200 text-xs font-semibold"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteStudent(student.id)}
                  disabled={deleting === student.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-red-800 text-red-300 text-xs font-semibold disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {students.length > 0 && hasMore ? (
        <div className="mt-4 pb-2 flex justify-center">
          <button
            onClick={() => fetchStudents(false)}
            disabled={loadingMore}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {loadingMore ? 'Loading more...' : 'Load More Students'}
          </button>
        </div>
      ) : null}
      </div>

      {editingStudent ? (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-slate-100">Edit Student</h3>
              <button onClick={closeEditModal} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={editForm.full_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Full Name"
                required
                className="spotlight-field px-3 py-2.5 border border-slate-600 bg-slate-800 text-slate-100 rounded-lg outline-none"
              />
              <input
                value={editForm.student_id}
                onChange={(e) => setEditForm((prev) => ({ ...prev, student_id: e.target.value }))}
                placeholder="Student ID"
                required
                className="spotlight-field px-3 py-2.5 border border-slate-600 bg-slate-800 text-slate-100 rounded-lg outline-none"
              />
              <input
                type="number"
                min={1}
                step={1}
                value={editForm.bus_no}
                onChange={(e) => setEditForm((prev) => ({ ...prev, bus_no: e.target.value }))}
                placeholder="Bus No"
                required
                className="spotlight-field px-3 py-2.5 border border-slate-600 bg-slate-800 text-slate-100 rounded-lg outline-none"
              />
              <input
                value={editForm.contact_no}
                onChange={(e) => setEditForm((prev) => ({ ...prev, contact_no: e.target.value }))}
                placeholder="Contact"
                required
                className="spotlight-field px-3 py-2.5 border border-slate-600 bg-slate-800 text-slate-100 rounded-lg outline-none"
              />
              <input
                value={editForm.bus_stop}
                onChange={(e) => setEditForm((prev) => ({ ...prev, bus_stop: e.target.value }))}
                placeholder="Bus Stop"
                required
                className="spotlight-field px-3 py-2.5 border border-slate-600 bg-slate-800 text-slate-100 rounded-lg outline-none md:col-span-2"
              />

              <div className="md:col-span-2 flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
                <input
                  type="checkbox"
                  checked={editForm.fees_paid}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      fees_paid: e.target.checked,
                      fees_paid_at: e.target.checked ? prev.fees_paid_at : '',
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-300">Fees Paid</span>
                {editForm.fees_paid ? (
                  <input
                    type="date"
                    value={editForm.fees_paid_at}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, fees_paid_at: e.target.value }))}
                    required
                    className="spotlight-field ml-auto px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 rounded-md"
                  />
                ) : null}
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 mt-1">
                <button type="button" onClick={closeEditModal} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-400"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {qrStudent ? (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-slate-100">ID Card & QR</h3>
              <button onClick={closeQrModal} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-300">V Card Live Preview</p>
                <div className="mt-3 min-h-[390px] rounded-xl border border-slate-700 bg-slate-900/70 p-3 flex items-center justify-center">
                  {vCardPreviewLoading || qrLoading ? (
                    <div className="h-[360px] w-[300px] rounded-2xl bg-slate-800 animate-pulse" />
                  ) : vCardPreviewUrl ? (
                    <img src={vCardPreviewUrl} alt="V Card Preview" className="w-[320px] max-w-full rounded-2xl border border-slate-700" />
                  ) : (
                    <p className="text-slate-400 text-sm">V card preview will appear here.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Actions</p>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    disabled={!qrImageUrl || qrLoading}
                    onClick={downloadQrImage}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" /> Download QR PNG
                  </button>
                  <button
                    type="button"
                    disabled={!qrImageUrl || qrLoading || bulkBusy}
                    onClick={downloadVCardImage}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" /> Download V Card PNG
                  </button>
                  <button
                    type="button"
                    disabled={!qrImageUrl || qrLoading}
                    onClick={printVCard}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" /> Print V Card
                  </button>
                </div>

                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300 leading-relaxed">
                  QR payload format:
                  <div className="mt-1 font-mono text-emerald-300">{"{"}"type":"bus_pass","student_id":"..."{"}"}</div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-300">Global Canvas Designer</p>
                  <p className="mt-1 text-xs text-slate-400">Open full-screen canvas and drag photo/QR directly.</p>
                  <button
                    type="button"
                    onClick={() => setCanvasDesignerOpen(true)}
                    disabled={!qrImageUrl || qrLoading}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                  >
                    Open Global Canvas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {canvasDesignerOpen && qrStudent ? (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm">
          <div className="h-full w-full p-3 md:p-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] gap-3 md:gap-4 overflow-hidden">
            <div className="min-h-0 rounded-2xl border border-slate-700 bg-slate-900/60 p-3 md:p-4 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm md:text-base font-bold text-slate-100">Global V Card Canvas</h3>
                  <p className="text-xs text-slate-400">Drag photo or QR to reposition</p>
                </div>

                <div
                  ref={stageRef}
                  className="relative mx-auto aspect-[640/760] rounded-3xl border border-slate-700 overflow-hidden select-none touch-none"
                  style={{
                    background: 'linear-gradient(165deg, #0f172a, #1e293b 60%, #0b1220)',
                    width: 'min(100%, calc((100vh - 180px) * 0.8421))',
                    maxHeight: 'calc(100vh - 180px)',
                  }}
                >
                  {cardTheme.backgroundImageUrl ? (
                    <img
                      src={cardTheme.backgroundImageUrl}
                      alt="Background"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{ opacity: cardTheme.backgroundOpacity, filter: `blur(${cardTheme.backgroundBlur}px)` }}
                    />
                  ) : null}
                  <div className="absolute inset-x-0 top-0 h-[24.7%] bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.45),_transparent_60%)]" />
                  <div className="absolute inset-x-0 top-[17.9%] border-t border-slate-600/80" />

                  <p className="absolute left-[5%] top-[6%] text-[0.95rem] md:text-[1.05rem] tracking-[0.16em]" style={{ color: cardTheme.titleTopColor }}>
                    {truncateForCard(cardTheme.titleTop, 34)}
                  </p>
                  <p className="absolute left-[5%] top-[11.5%] text-[1.35rem] md:text-[1.8rem] font-bold" style={{ color: cardTheme.titleMainColor }}>
                    {truncateForCard(cardTheme.titleMain, 30)}
                  </p>

                  <button
                    type="button"
                    onPointerDown={(event) => startCanvasDrag('photo', event)}
                    className={`absolute border-2 ${canvasDragTarget === 'photo' ? 'border-emerald-400' : 'border-slate-500'} shadow-sm cursor-grab active:cursor-grabbing overflow-hidden bg-slate-700`}
                    style={{
                      left: `${(cardDesign.photoX / 640) * 100}%`,
                      top: `${(cardDesign.photoY / 760) * 100}%`,
                      width: `${(cardDesign.photoSize / 640) * 100}%`,
                      height: `${(cardDesign.photoSize / 760) * 100}%`,
                      borderRadius: `${cardDesign.photoRadius}px`,
                    }}
                  >
                    {qrStudent.image_url && !canvasPhotoLoadFailed ? (
                      <img
                        src={qrStudent.image_url}
                        alt={qrStudent.full_name}
                        className="h-full w-full object-cover pointer-events-none"
                        onError={() => setCanvasPhotoLoadFailed(true)}
                      />
                    ) : (
                      <span className="h-full w-full flex items-center justify-center text-slate-100 text-3xl font-bold pointer-events-none">
                        {(qrStudent.full_name.trim().charAt(0) || '?').toUpperCase()}
                      </span>
                    )}
                  </button>

                  <div
                    className="absolute font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{
                      left: `${((cardDesign.photoX + cardDesign.photoSize + 18) / 640) * 100}%`,
                      top: `${((cardDesign.photoY + 2) / 760) * 100}%`,
                      width: `${((640 - (cardDesign.photoX + cardDesign.photoSize + 28)) / 640) * 100}%`,
                      fontSize: `${cardTheme.nameTextSize * 0.62}px`,
                      color: cardTheme.titleMainColor,
                    }}
                  >
                    {truncateForCard(qrStudent.full_name, 24)}
                  </div>
                  <div
                    className="absolute"
                    style={{
                      left: `${((cardDesign.photoX + cardDesign.photoSize + 18) / 640) * 100}%`,
                      top: `${((cardDesign.photoY + 48) / 760) * 100}%`,
                      fontSize: `${cardTheme.infoTextSize * 0.6}px`,
                      color: cardTheme.bodyTextColor,
                    }}
                  >
                    {cardTheme.idLabel}: {qrStudent.student_id}
                  </div>
                  <div
                    className="absolute"
                    style={{
                      left: `${((cardDesign.photoX + cardDesign.photoSize + 18) / 640) * 100}%`,
                      top: `${((cardDesign.photoY + 82) / 760) * 100}%`,
                      fontSize: `${cardTheme.infoTextSize * 0.6}px`,
                      color: cardTheme.bodyTextColor,
                    }}
                  >
                    {cardTheme.busNoLabel}: {qrStudent.bus_no ?? '-'}
                  </div>
                  <div
                    className="absolute"
                    style={{
                      left: `${((cardDesign.photoX + cardDesign.photoSize + 18) / 640) * 100}%`,
                      top: `${((cardDesign.photoY + 116) / 760) * 100}%`,
                      fontSize: `${cardTheme.infoTextSize * 0.6}px`,
                      color: cardTheme.bodyTextColor,
                    }}
                  >
                    {cardTheme.stopLabel}: {truncateForCard(qrStudent.bus_stop, 28)}
                  </div>

                  <div className="absolute left-[5%] top-[48.4%] w-[90%] h-[38.4%] rounded-2xl border border-slate-600 bg-[#0b1935]" />

                  <button
                    type="button"
                    onPointerDown={(event) => startCanvasDrag('qr', event)}
                    className={`absolute cursor-grab active:cursor-grabbing rounded-xl bg-white p-2 border-2 ${canvasDragTarget === 'qr' ? 'border-emerald-400' : 'border-white'} shadow-lg`}
                    style={{
                      left: `${((320 - cardDesign.qrSize / 2 - 12) / 640) * 100}%`,
                      top: `${((cardDesign.qrY - 12) / 760) * 100}%`,
                      width: `${((cardDesign.qrSize + 24) / 640) * 100}%`,
                      height: `${((cardDesign.qrSize + 24) / 760) * 100}%`,
                    }}
                  >
                    {qrImageUrl ? <img src={qrImageUrl} alt="QR" className="h-full w-full object-contain pointer-events-none" /> : null}
                  </button>

                  <p className="absolute left-1/2 -translate-x-1/2 top-[92.6%] text-[0.85rem] md:text-[1.4rem] whitespace-nowrap" style={{ color: cardTheme.footerColor, fontSize: `${cardTheme.footerTextSize * 0.55}px` }}>
                    {truncateForCard(cardTheme.footerText, 40)}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 rounded-2xl border border-slate-700 bg-slate-900/70 p-3 md:p-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-100">Global Controls</h4>
                <button
                  type="button"
                  onClick={() => setCanvasDesignerOpen(false)}
                  className="text-xs px-2.5 py-1 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-400">These settings apply to all card image exports, print, and ZIP bulk generation.</p>

              <div className="mt-4 space-y-2 rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-300">Text & Colors</p>
                <input
                  value={cardTheme.titleTop}
                  onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, titleTop: e.target.value }))}
                  placeholder="Top Title"
                  className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-800 text-slate-100 text-xs"
                />
                <input
                  value={cardTheme.titleMain}
                  onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, titleMain: e.target.value }))}
                  placeholder="Main Title"
                  className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-800 text-slate-100 text-xs"
                />
                <input
                  value={cardTheme.footerText}
                  onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, footerText: e.target.value }))}
                  placeholder="Footer Text"
                  className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-800 text-slate-100 text-xs"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={cardTheme.idLabel}
                    onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, idLabel: e.target.value }))}
                    placeholder="ID Label"
                    className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-800 text-slate-100 text-xs"
                  />
                  <input
                    value={cardTheme.busNoLabel}
                    onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, busNoLabel: e.target.value }))}
                    placeholder="Bus Label"
                    className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-800 text-slate-100 text-xs"
                  />
                  <input
                    value={cardTheme.stopLabel}
                    onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, stopLabel: e.target.value }))}
                    placeholder="Stop Label"
                    className="w-full px-2.5 py-2 rounded-md border border-slate-700 bg-slate-800 text-slate-100 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-slate-700 bg-slate-800">
                    Top
                    <input type="color" value={cardTheme.titleTopColor} onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, titleTopColor: e.target.value }))} />
                  </label>
                  <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-slate-700 bg-slate-800">
                    Main
                    <input type="color" value={cardTheme.titleMainColor} onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, titleMainColor: e.target.value }))} />
                  </label>
                  <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-slate-700 bg-slate-800">
                    Body
                    <input type="color" value={cardTheme.bodyTextColor} onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, bodyTextColor: e.target.value }))} />
                  </label>
                  <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-slate-700 bg-slate-800">
                    Footer
                    <input type="color" value={cardTheme.footerColor} onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, footerColor: e.target.value }))} />
                  </label>
                </div>
              </div>

              <div className="mt-4 space-y-2 rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-300">Font Sizes</p>
                <label className="block text-xs text-slate-300">
                  Name Size: {cardTheme.nameTextSize}
                  <input type="range" min={28} max={82} value={cardTheme.nameTextSize} onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, nameTextSize: Number(e.target.value) }))} className="mt-1 w-full" />
                </label>
                <label className="block text-xs text-slate-300">
                  Info Size: {cardTheme.infoTextSize}
                  <input type="range" min={16} max={58} value={cardTheme.infoTextSize} onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, infoTextSize: Number(e.target.value) }))} className="mt-1 w-full" />
                </label>
                <label className="block text-xs text-slate-300">
                  Footer Size: {cardTheme.footerTextSize}
                  <input type="range" min={20} max={68} value={cardTheme.footerTextSize} onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, footerTextSize: Number(e.target.value) }))} className="mt-1 w-full" />
                </label>
              </div>

              <div className="mt-4 space-y-2 rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-300">Background Image</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      uploadBackgroundImage(file)
                    }
                  }}
                  className="w-full text-xs text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setCardTheme((prev) => ({ ...prev, backgroundImageUrl: '' }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
                >
                  Remove Background
                </button>
                <label className="block text-xs text-slate-300">
                  Background Opacity: {cardTheme.backgroundOpacity}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={cardTheme.backgroundOpacity}
                    onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, backgroundOpacity: Number(e.target.value) }))}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block text-xs text-slate-300">
                  Background Blur: {cardTheme.backgroundBlur}px
                  <input
                    type="range"
                    min={0}
                    max={14}
                    step={1}
                    value={cardTheme.backgroundBlur}
                    onChange={(e) => setCardTheme((prev) => clampCardTheme({ ...prev, backgroundBlur: Number(e.target.value) }))}
                    className="mt-1 w-full"
                  />
                </label>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-slate-300">
                <label className="block">
                  Photo Horizontal: {cardDesign.photoX}
                  <input
                    type="range"
                    min={40}
                    max={130}
                    value={cardDesign.photoX}
                    onChange={(e) => setCardDesign((prev) => clampCardDesign({ ...prev, photoX: Number(e.target.value) }))}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block">
                  Photo Vertical: {cardDesign.photoY}
                  <input
                    type="range"
                    min={150}
                    max={210}
                    value={cardDesign.photoY}
                    onChange={(e) => setCardDesign((prev) => clampCardDesign({ ...prev, photoY: Number(e.target.value) }))}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block">
                  Photo Size: {cardDesign.photoSize}
                  <input
                    type="range"
                    min={84}
                    max={160}
                    value={cardDesign.photoSize}
                    onChange={(e) => setCardDesign((prev) => clampCardDesign({ ...prev, photoSize: Number(e.target.value) }))}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block">
                  Photo Corner Radius: {cardDesign.photoRadius}
                  <input
                    type="range"
                    min={8}
                    max={28}
                    value={cardDesign.photoRadius}
                    onChange={(e) => setCardDesign((prev) => clampCardDesign({ ...prev, photoRadius: Number(e.target.value) }))}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block">
                  QR Size: {cardDesign.qrSize}
                  <input
                    type="range"
                    min={170}
                    max={240}
                    value={cardDesign.qrSize}
                    onChange={(e) => setCardDesign((prev) => clampCardDesign({ ...prev, qrSize: Number(e.target.value) }))}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block">
                  QR Vertical: {cardDesign.qrY}
                  <input
                    type="range"
                    min={390}
                    max={430}
                    value={cardDesign.qrY}
                    onChange={(e) => setCardDesign((prev) => clampCardDesign({ ...prev, qrY: Number(e.target.value) }))}
                    className="mt-1 w-full"
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCardDesign(defaultVCardDesign)
                    setCardTheme(defaultVCardTheme)
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
                >
                  Reset Layout
                </button>
                <button
                  type="button"
                  onClick={saveGlobalSettings}
                  disabled={settingsSaving || backgroundUploading}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {settingsSaving ? 'Saving...' : 'Save to Cloud'}
                </button>
              </div>

              {settingsMessage ? <p className="mt-2 text-xs text-emerald-300">{settingsMessage}</p> : null}
              {backgroundUploading ? <p className="mt-1 text-xs text-slate-300">Uploading background image...</p> : null}

              <button
                type="button"
                onClick={() => setCanvasDesignerOpen(false)}
                className="mt-2 w-full px-3 py-2 rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
