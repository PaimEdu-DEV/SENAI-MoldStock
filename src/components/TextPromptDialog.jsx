import { useEffect, useState } from 'react'
import { Button } from './ui/button.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.jsx'
import { Input } from './ui/input.jsx'

export default function TextPromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label = 'Nome',
  initialValue = '',
  confirmLabel = 'Salvar',
  loading = false,
  onConfirm,
}) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (open) setValue(initialValue || '')
  }, [initialValue, open])

  function handleSubmit(event) {
    event.preventDefault()
    const nextValue = value.trim()
    if (!nextValue) return
    onConfirm(nextValue)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {label}
            <Input autoFocus required value={value} onChange={(event) => setValue(event.target.value)} />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !value.trim()}>
              {loading ? 'Salvando...' : confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
