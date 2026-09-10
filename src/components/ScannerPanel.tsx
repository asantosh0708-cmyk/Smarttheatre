import { useEffect, useRef, useState, useCallback, useId } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Camera, CameraOff, Keyboard } from 'lucide-react'

export function useScanner(onScan: (code: string) => void) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScanRef = useRef<{ code: string; time: number } | null>(null)
  const uniqueId = useId()
  const containerId = `qr-scanner-${uniqueId.replace(/[^a-zA-Z0-9-]/g, '')}`
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const startScanning = useCallback(async () => {
    setError('')
    try {
      const container = document.getElementById(containerId)
      if (!container) {
        setError('Scanner container not found.')
        return
      }

      const scanner = new Html5Qrcode(containerId)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const now = Date.now()
          const code = decodedText.trim().toUpperCase()
          if (
            lastScanRef.current &&
            lastScanRef.current.code === code &&
            now - lastScanRef.current.time < 3000
          ) {
            return
          }
          lastScanRef.current = { code, time: now }
          onScanRef.current(code)
        },
        () => {},
      )
      setScanning(true)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to access camera.'
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setError('Camera permission denied. Allow camera access in your browser settings.')
      } else if (msg.includes('NotFound') || msg.includes('Device') || msg.includes('camera')) {
        setError('No camera found. Use manual code entry below.')
      } else {
        setError(`Camera error: ${msg}`)
      }
      scannerRef.current = null
    }
  }, [containerId])

  const stopScanning = useCallback(async () => {
    const scanner = scannerRef.current
    if (scanner) {
      try {
        const state = scanner.getState()
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scanner.stop()
        }
        await scanner.clear()
      } catch {
        // ignore
      }
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      if (scanner) {
        try {
          scanner.clear()
        } catch {
          // ignore
        }
        scannerRef.current = null
      }
    }
  }, [])

  return { scanning, error, startScanning, stopScanning, containerId }
}

export function ScannerPanel({
  onScan,
  title,
  accentColor,
}: {
  onScan: (code: string) => void
  title: string
  accentColor: 'teal' | 'blue'
}) {
  const { scanning, error, startScanning, stopScanning, containerId } = useScanner(onScan)
  const [manualCode, setManualCode] = useState('')

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      onScan(manualCode.trim())
      setManualCode('')
    }
  }

  const accent =
    accentColor === 'teal'
      ? { text: 'text-teal-400', border: 'border-teal-500/30', bg: 'bg-teal-500/10' }
      : { text: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-semibold ${accent.text} uppercase tracking-wide`}>
            {title}
          </h3>
          <div className="flex gap-2">
            {scanning ? (
              <button
                onClick={stopScanning}
                className="flex items-center gap-1.5 text-xs text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
              >
                <CameraOff className="w-3.5 h-3.5" />
                Stop Camera
              </button>
            ) : (
              <button
                onClick={startScanning}
                className="flex items-center gap-1.5 text-xs text-teal-400 border border-teal-500/30 px-3 py-1.5 rounded-lg hover:bg-teal-500/10"
              >
                <Camera className="w-3.5 h-3.5" />
                Start Camera
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <div className="relative w-full min-h-[200px] sm:min-h-[300px] bg-ink-900 rounded-lg overflow-hidden">
          <div id={containerId} className="w-full h-full min-h-[200px] sm:min-h-[300px]" />
          {!scanning && (
            <div className="absolute inset-0 flex items-center justify-center text-ink-400 text-sm text-center px-4 py-12 pointer-events-none">
              <div>
                <Camera className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Camera is off. Press "Start Camera" to scan QR codes.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual input */}
      <div className={`card ${accent.bg} ${accent.border} border-l-4`}>
        <div className="flex items-center gap-2 mb-2">
          <Keyboard className={`w-4 h-4 ${accent.text}`} />
          <label className={`text-sm font-medium ${accent.text}`}>
            Manual Code Entry
          </label>
          <span className="text-xs text-ink-400">(behaves like a barcode scanner — press Enter)</span>
        </div>
        <form onSubmit={handleManualSubmit}>
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter ticket code..."
            className="input-field font-mono uppercase tracking-wider"
            autoFocus
          />
        </form>
      </div>
    </div>
  )
}
