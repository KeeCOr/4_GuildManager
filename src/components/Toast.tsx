import { useEffect, useState, useCallback, useRef } from 'react'

export type ToastType = 'success' | 'error'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastProps {
  toasts: ToastItem[]
  onRemove: (id: number) => void
}

export function ToastContainer({ toasts, onRemove }: ToastProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <ToastBubble key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastBubble({ toast, onRemove }: { toast: ToastItem; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation on next frame
    const enter = requestAnimationFrame(() => setVisible(true))
    const exit = setTimeout(() => setVisible(false), 1200)
    const remove = setTimeout(() => onRemove(toast.id), 1600)
    return () => {
      cancelAnimationFrame(enter)
      clearTimeout(exit)
      clearTimeout(remove)
    }
  }, [toast.id, onRemove])

  const isError = toast.type === 'error'

  return (
    <div
      className="gm-toast-frame"
      style={{
        padding: '10px 16px',
        borderRadius: 10,
        color: isError ? '#fca5a5' : '#86efac',
        fontWeight: 700,
        fontSize: 14,
        border: `1px solid ${isError ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.4)'}`,
        boxShadow: `0 4px 20px ${isError ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`,
        whiteSpace: 'nowrap',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(24px)',
        pointerEvents: 'none',
        minWidth: 160,
        textAlign: 'center',
      }}
    >
      {isError ? '⚠️' : '✅'} {toast.message}
    </div>
  )
}

let _nextId = 1

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = _nextId++
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, removeToast }
}
