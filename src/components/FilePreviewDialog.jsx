import { Download, ZoomIn } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog.jsx'
import { Button } from './ui/button.jsx'
import { isImageFile, isPdfFile } from '../services/storageService.js'

export default function FilePreviewDialog({ file, onClose }) {
  if (!file) return null
  const title = file.name || file.title || file.fileName || 'Arquivo'

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {isImageFile(file) ? (
          <div className="max-h-[72vh] overflow-auto rounded-2xl bg-slate-950/5 p-3">
            <img src={file.url} alt={title} className="mx-auto max-h-none w-auto rounded-xl" />
          </div>
        ) : isPdfFile(file) ? (
          <iframe
            title={title}
            src={file.url}
            className="h-[72vh] w-full rounded-2xl border border-slate-200 bg-white"
          />
        ) : (
          <div className="grid place-items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
            <ZoomIn className="h-10 w-10 text-slate-400" />
            <p className="max-w-md text-sm text-slate-500">
              Este formato não possui visualização integrada. Use o download para abrir no software adequado.
            </p>
          </div>
        )}
        <div className="flex justify-end">
          <Button asChild variant="secondary">
            <a href={file.url} download={title} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
