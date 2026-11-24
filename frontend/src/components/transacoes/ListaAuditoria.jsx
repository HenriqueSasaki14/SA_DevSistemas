import { formatarDataHora } from '../../utils/datas'

/** Linha do tempo de registros de auditoria (usada no modal e na área administrativa). */
export default function ListaAuditoria({ registros, mostrarTransacao = false }) {
  if (registros.length === 0) {
    return <p className="state-msg">Nenhum registro de auditoria encontrado.</p>
  }

  return (
    <div className="audit-timeline">
      {registros.map((a) => (
        <div className="audit-entry" key={a.id}>
          <div className="audit-header">
            <span className={`audit-badge ${a.tipoAcao}`}>{a.tipoAcao}</span>
            <span className="audit-date">{formatarDataHora(a.dataAcao)}</span>
          </div>
          <div className="audit-author">
            Responsável: <strong>{a.usuario?.nome || 'Usuário'}</strong> ({a.usuario?.email || '-'})
            {mostrarTransacao && a.transacao && <> · Transação #{a.transacao.id}: <strong>{a.transacao.descricao}</strong></>}
          </div>
          <pre className="audit-diff">{JSON.stringify(a.dadosAlterados, null, 2)}</pre>
        </div>
      ))}
    </div>
  )
}
