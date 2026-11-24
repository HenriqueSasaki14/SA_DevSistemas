import { useEffect } from 'react'

/** Modal base: fecha com ESC ou clique fora. */
export default function Modal({ titulo, corTitulo, largura, onFechar, children, rodape }) {
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        style={largura ? { maxWidth: largura } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title" style={corTitulo ? { color: corTitulo } : undefined}>{titulo}</h3>
          <button className="btn-modal-close" onClick={onFechar} aria-label="Fechar">✕</button>
        </div>
        {children}
        {rodape && <div className="modal-footer">{rodape}</div>}
      </div>
    </div>
  )
}
