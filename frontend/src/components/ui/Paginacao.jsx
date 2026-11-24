import { memo } from 'react'

/** Controles de paginação. `paginacao` vem pronto da API ({ pagina, totalPaginas, total }). */
function Paginacao({ paginacao, onMudar, rotuloItens = 'registros' }) {
  if (!paginacao) return null
  const { pagina, totalPaginas, total } = paginacao

  return (
    <div className="paginacao">
      <span className="paginacao-info">
        {total} {rotuloItens} · página {pagina} de {totalPaginas}
      </span>
      <div className="paginacao-botoes">
        <button className="btn-pag" disabled={pagina <= 1} onClick={() => onMudar(pagina - 1)} aria-label="Página anterior">
          ‹ Anterior
        </button>
        <button className="btn-pag" disabled={pagina >= totalPaginas} onClick={() => onMudar(pagina + 1)} aria-label="Próxima página">
          Próxima ›
        </button>
      </div>
    </div>
  )
}

export default memo(Paginacao)
