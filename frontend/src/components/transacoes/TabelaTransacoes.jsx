import { memo } from 'react'
import { formatarData } from '../../utils/datas'

/** Uma linha da listagem. memo: só re-renderiza se a própria transação mudar. */
const LinhaTransacao = memo(function LinhaTransacao({ t, onEditar, onAuditoria, onExcluir }) {
  const tipo = t.tipo.toLowerCase()
  return (
    <div className="trans-item">
      <div className={`trans-icon ${tipo}`} aria-hidden="true">{t.tipo === 'ENTRADA' ? '+' : '−'}</div>
      <div className="trans-info">
        <p className="trans-desc">{t.descricao}</p>
        <div className="trans-meta">
          <span className="trans-date">{formatarData(t.dataTransacao)}</span>
          <span className={`trans-badge ${tipo}`}>{t.tipo}</span>
          <span className="trans-date" title={`Chave única anti-duplicação: ${t.chaveUnica}`}>
            🔑 {t.chaveUnica.length > 12 ? `${t.chaveUnica.substring(0, 12)}…` : t.chaveUnica}
          </span>
        </div>
      </div>
      <span className={`trans-value ${tipo}`}>{t.tipo === 'ENTRADA' ? '+ ' : '- '}{t.valorFormatado}</span>
      <div className="trans-actions">
        <button className="btn-icon-action" title="Editar lançamento" aria-label={`Editar ${t.descricao}`} onClick={() => onEditar(t)}>✏️</button>
        <button className="btn-icon-action audit" title="Ver trilha de auditoria" aria-label={`Auditoria de ${t.descricao}`} onClick={() => onAuditoria(t)}>📋</button>
        <button className="btn-icon-action delete" title="Excluir (Soft Delete)" aria-label={`Excluir ${t.descricao}`} onClick={() => onExcluir(t)}>🗑️</button>
      </div>
    </div>
  )
})

function TabelaTransacoes({ transacoes, carregando, filtrando, onNova, ...acoes }) {
  if (transacoes.length === 0 && !carregando) {
    return (
      <div className="state-msg">
        <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{filtrando ? '🔎' : '📭'}</p>
        <p>{filtrando ? 'Nenhuma transação encontrada com esses filtros.' : 'Nenhuma transação ativa cadastrada.'}</p>
        {!filtrando && (
          <button className="btn-primary-action" style={{ margin: '1rem auto 0' }} onClick={onNova}>
            Cadastrar Primeiro Lançamento
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`trans-list ${carregando ? 'carregando' : ''}`} aria-busy={carregando}>
      {transacoes.map((t) => <LinhaTransacao key={t.id} t={t} {...acoes} />)}
    </div>
  )
}

export default memo(TabelaTransacoes)
