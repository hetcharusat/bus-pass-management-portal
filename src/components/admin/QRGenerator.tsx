import React, { useEffect, useRef } from 'react'
import * as QRCode from 'qrcode'

interface QRGeneratorProps {
  studentId: string
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({ studentId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, studentId, { width: 150 }, (err: Error | null | undefined) => {
        if (err) console.error('QR Code generation error:', err)
      })
    }
  }, [studentId])

  const downloadQR = async () => {
    if (canvasRef.current) {
      const link = document.createElement('a')
      link.download = `${studentId}-qr.png`
      link.href = canvasRef.current.toDataURL()
      link.click()
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-2 bg-white border-2 border-gray-200 rounded-lg">
        <canvas ref={canvasRef} />
      </div>
      <button
        onClick={downloadQR}
        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
      >
        Download QR
      </button>
    </div>
  )
}
