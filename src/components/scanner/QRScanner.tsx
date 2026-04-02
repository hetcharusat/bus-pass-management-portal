import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface ScannedStudent {
  id: string
  full_name: string
  student_id: string
  bus_stop: string
  fees_paid: boolean
  image_url: string | null
}

interface QRScannerProps {
  onScan?: (student: ScannedStudent) => void
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scannedStudent, setScannedStudent] = useState<ScannedStudent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        startScanning()
      }
    } catch (err) {
      setError('Failed to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
  }

  const startScanning = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const scanFrame = async () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      try {
        // Simple barcode detection using canvas - in production use a proper library
        // This is a placeholder for QR detection
        // For now, we'll use a text input as fallback
        // In production, integrate ZXing or a similar library
      } catch (err) {
        // Continue scanning
      }

      animationRef.current = requestAnimationFrame(scanFrame)
    }

    animationRef.current = requestAnimationFrame(scanFrame)
  }

  const handleManualScan = async (studentUuid: string) => {
    setError(null)
    setNotFound(false)

    try {
      const { data, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentUuid)
        .single()

      if (fetchError || !data) {
        setNotFound(true)
        setScannedStudent(null)
        return
      }

      setScannedStudent(data)
      onScan?.(data)

      // Auto-reset after 5 seconds
      setTimeout(() => {
        setScannedStudent(null)
      }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan student')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Scanner View */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Scan Student QR Code</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="relative bg-black rounded-lg overflow-hidden mb-6 aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Manual Entry Fallback */}
          <div className="border-t pt-6">
            <p className="text-sm text-gray-600 mb-3">Or enter Student UUID manually:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste student UUID here"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    handleManualScan(e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
                  if (input.value) {
                    handleManualScan(input.value)
                    input.value = ''
                  }
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                Verify
              </button>
            </div>
          </div>
        </div>

        {/* Result Display */}
        {notFound && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
              <h2 className="text-2xl font-bold text-red-700">NOT FOUND</h2>
            </div>
            <p className="text-gray-600">This student is not registered in the system.</p>
          </div>
        )}

        {scannedStudent && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <h2 className="text-2xl font-bold text-green-700">STUDENT VERIFIED</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Student Photo */}
              <div className="flex justify-center">
                {scannedStudent.image_url ? (
                  <img
                    src={scannedStudent.image_url}
                    alt={scannedStudent.full_name}
                    className="w-40 h-40 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-40 h-40 rounded-lg bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-500">No Photo</span>
                  </div>
                )}
              </div>

              {/* Student Details */}
              <div className="col-span-2 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-lg font-semibold text-gray-800">{scannedStudent.full_name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Student ID</p>
                  <p className="text-lg font-semibold text-gray-800">{scannedStudent.student_id}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Bus Stop</p>
                  <p className="text-lg font-semibold text-gray-800">{scannedStudent.bus_stop}</p>
                </div>

                {/* Fees Status - Very Clear */}
                <div className="pt-4">
                  <p className="text-sm text-gray-600 mb-2">Fee Status</p>
                  {scannedStudent.fees_paid ? (
                    <div className="px-6 py-4 bg-green-100 border-2 border-green-500 rounded-lg text-center">
                      <p className="text-4xl font-bold text-green-700">PAID ✓</p>
                      <p className="text-sm text-green-600 mt-2">Student can board the bus</p>
                    </div>
                  ) : (
                    <div className="px-6 py-4 bg-red-100 border-2 border-red-500 rounded-lg text-center">
                      <p className="text-4xl font-bold text-red-700">UNPAID ✗</p>
                      <p className="text-sm text-red-600 mt-2">Student cannot board the bus</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
