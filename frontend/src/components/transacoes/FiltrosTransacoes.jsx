import { memo } from 'react'

const ORDENACOES = [
  { valor: 'dataTransacao:desc', rotulo: 'Mais recentes' },
  { valor: 'dataTransacao:asc', rotulo: 'Mais antigas' },
  { valor: 'valorCentavos:desc', rotulo: 'Maior valor' },
  { valor: 'valorCentavos:asc', rotulo: 'Menor valor' },
  { valor: 'descricao:asc', rotulo: 'Descrição (A-Z)' },
]

/** Barra de busca e filtros da listagem. Toda alteração volta para a página 1 (feito pelo pai). */
function FiltrosTransacoes({ filtros, busca, onBusca, onFiltro, onLimpar, onExportar, exportando }) {
  const temFiltro = busca || filtros.tipo || filtros.dataInicio || filtros.dataFim

  return (
    <div className="filtros" role="search">
      <input
        type="search"
        className="form-input filtro-busca"
        placeholder="🔍 Buscar pela descrição..."
        aria-label="Buscar pela descrição"
        value={busca}
        onChange={(e) => onBusca(e.target.value)}
      />

      <select className="form-input" aria-label="Filtrar por tipo" value={filtros.tipo} onChange={(e) => onFiltro({ tipo: e.target.value })}>
        <option value="">Todos os tipos</option>
        <option value="ENTRADA">Entradas</option>
        <option value="SAIDA">Saídas</option>
      </select>

      <label className="filtro-data">
        <span>De</span>
        <input type="date" className="form-input" value={filtros.dataInicio} max={filtros.dataFim || undefined}
          onChange={(e) => onFiltro({ dataInicio: e.target.value })} />
      </label>
      <label className="filtro-data">
        <span>Até</span>
        <input type="date" className="form-input" value={filtros.dataFim} min={filtros.dataInicio || undefined}
          onChange={(e) => onFiltro({ dataFim: e.target.value })} />
      </label>

      <select
        className="form-input"
        aria-label="Ordenar por"
        value={`${filtros.ordenarPor}:${filtros.ordem}`}
        onChange={(e) => {
          const [ordenarPor, ordem] = e.target.value.split(':')
          onFiltro({ ordenarPor, ordem })
        }}
      >
        {ORDENACOES.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>

      <div className="filtros-acoes">
        {temFiltro && <button type="button" className="btn-pag" onClick={onLimpar}>Limpar filtros</button>}
        <button type="button" className="btn-pag" onClick={onExportar} disabled={exportando}
          title="Baixa o extrato do período filtrado (ou do mês atual) em CSV">
          {exportando ? 'Gerando...' : '⬇ Extrato CSV'}
        </button>
      </div>
    </div>
  )
}

export default memo(FiltrosTransacoes)
