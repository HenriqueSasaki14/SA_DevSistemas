import { useCallback, useMemo, useState } from 'react'
import { ToastContext } from './toast'

const DURACAO_MS = 4000
const ICONES = { sucesso: '✓', erro: '⚠', info: 'ℹ' }
let proximoId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remover = useCallback((id) => {
    setToasts((lista) => lista.filter((t) => t.id !== id))
  }, [])

  const mostrar = useCallback((tipo, mensagem) => {
    const id = proximoId++
    setToasts((lista) => [...lista.slice(-3), { id, tipo, mensagem }])
    setTimeout(() => remover(id), DURACAO_MS)
  }, [remover])

  const api = useMemo(() => ({
    sucesso: (msg) => mostrar('sucesso', msg),
    erro: (msg) => mostrar('erro', msg),
    info: (msg) => mostrar('info', msg),
  }), [mostrar])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-area" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`}>
            <span className="toast-icone" aria-hidden="true">{ICONES[t.tipo]}</span>
            <span className="toast-msg">{t.mensagem}</span>
            <button className="toast-fechar" onClick={() => remover(t.id)} aria-label="Fechar aviso">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
