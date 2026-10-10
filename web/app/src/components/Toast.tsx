import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconClose } from './icons'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  msg: string
  type: ToastType
  action?: { label: string; fn: () => void }
}

interface ToastCtxValue {
  toast: (msg: string, opts?: { type?: ToastType; action?: { label: string; fn: () => void } }) => void
}

const ToastCtx = createContext<ToastCtxValue>({ toast: () => {} })
export const useToast = () => useContext(ToastCtx)

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const hovered = useRef(new Set<number>())
  const focused = useRef(new Set<number>())
  useEffect(() => {
    const activeTimers = timers.current
    return () => { activeTimers.forEach(clearTimeout); activeTimers.clear() }
  }, [])
  useEffect(() => {
    const visible = new Set(items.map(item => item.id))
    for (const [id, timer] of timers.current) {
      if (!visible.has(id)) { clearTimeout(timer); timers.current.delete(id) }
    }
    for (const id of hovered.current) if (!visible.has(id)) hovered.current.delete(id)
    for (const id of focused.current) if (!visible.has(id)) focused.current.delete(id)
  }, [items])

  const dismiss = useCallback((id: number) => {
    setItems(p => p.filter(t => t.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    hovered.current.delete(id)
    focused.current.delete(id)
  }, [])

  const toast = useCallback((
    msg: string,
    opts?: { type?: ToastType; action?: { label: string; fn: () => void } }
  ) => {
    const id = ++seq
    setItems(p => [...p.slice(-2), { id, msg, type: opts?.type ?? 'success', action: opts?.action }])
    timers.current.set(id, setTimeout(() => dismiss(id), opts?.action ? 10000 : 4000))
  }, [dismiss])

  const context = useMemo(() => ({ toast }), [toast])

  function pause(id: number) {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }
  function resume(item: ToastItem) {
    if (hovered.current.has(item.id) || focused.current.has(item.id)) return
    pause(item.id)
    timers.current.set(item.id, setTimeout(() => dismiss(item.id), item.action ? 10000 : 4000))
  }

  return (
    <ToastCtx.Provider value={context}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map(item => (
          <div key={item.id} className={`toast toast-${item.type}`} role="status"
            onMouseEnter={() => { hovered.current.add(item.id); pause(item.id) }}
            onMouseLeave={() => { hovered.current.delete(item.id); resume(item) }}
            onFocusCapture={() => { focused.current.add(item.id); pause(item.id) }}
            onBlurCapture={event => {
              if (event.currentTarget.contains(event.relatedTarget)) return
              focused.current.delete(item.id)
              resume(item)
            }}>
            <span className="toast-msg">{item.msg}</span>
            {item.action && (
              <button
                type="button"
                className="toast-action-btn"
                onClick={() => { item.action!.fn(); dismiss(item.id) }}
              >
                {item.action.label}
              </button>
            )}
            <button type="button" className="toast-x" onClick={() => dismiss(item.id)} aria-label="Dismiss"><IconClose size={13} strokeWidth={2.4} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
