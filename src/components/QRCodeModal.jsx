import QRCode from 'qrcode'
import { Download, QrCode } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from './ui/button.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.jsx'
import { Select } from './ui/input.jsx'

export default function QRCodeModal({ piece, onClose }) {
  const [format, setFormat] = useState('png')
  const [qrImage, setQrImage] = useState('')
  const [error, setError] = useState('')
  const open = Boolean(piece)
  const url = useMemo(() => {
    if (!piece) return ''
    return `${window.location.origin}/peca/${piece.id}`
  }, [piece])

  useEffect(() => {
    if (!piece || !url) return

    setQrImage('')
    setError('')
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#101722',
        light: '#ffffff',
      },
    })
      .then(setQrImage)
      .catch((err) => setError(err.message))
  }, [piece, url])

  if (!piece) return null

  function downloadQrCode() {
    if (!qrImage) return

    const safeCode = String(piece.codigo || piece.id).replace(/[^a-z0-9-]/gi, '-')
    const link = document.createElement('a')

    if (format === 'png') {
      link.href = qrImage
      link.download = `qrcode-peca-${safeCode}.png`
      link.click()
      return
    }

    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0)
      link.href = canvas.toDataURL('image/jpeg', 0.95)
      link.download = `qrcode-peca-${safeCode}.jpg`
      link.click()
    }
    image.src = qrImage
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-senai-blue/10 text-senai-blue">
            <QrCode className="h-6 w-6" />
          </div>
          <DialogTitle>QR Code da peça</DialogTitle>
          <DialogDescription>
            Este código aponta para a página pública de {piece.nome}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid justify-items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="grid aspect-square w-full max-w-[352px] place-items-center rounded-3xl bg-white p-4 shadow-soft">
            {qrImage ? (
              <img
                src={qrImage}
                alt={`QR Code da peça ${piece.nome}`}
                className="h-full w-full max-h-80 max-w-80"
              />
            ) : (
              <div className="text-sm font-semibold text-slate-400">
                {error || 'Gerando QR Code...'}
              </div>
            )}
          </div>
          <p className="max-w-full break-words text-center text-xs font-medium text-slate-500">
            {url}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Select
            className="sm:w-36"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </Select>
          <Button type="button" onClick={downloadQrCode} disabled={!qrImage}>
            <Download className="h-4 w-4" />
            Baixar QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


