import Modal from '../ui/Modal'
import Skeleton from '../ui/Skeleton'
import ListaAuditoria from './ListaAuditoria'
import { api } from '../../services/api'
import { useRequisicao } from '../../hooks/useRequisicao'

export default function ModalAuditoria({ transacao, onFechar }) {
  const { dados, erro, carregando } = useRequisicao(() => api.auditoriaTransacao(transacao.id), `auditoria-${transacao.id}`)

  return (
    <Modal
      titulo="Trilha de Auditoria (Rastreabilidade)"
      largura="600px"
      onFechar={onFechar}
      rodape={<button type="button" className="btn-modal-cancel" onClick={onFechar}>Fechar</button>}
    >
      <div className="modal-body">
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Histórico imutável de alterações da transação: <strong>{transacao.descricao}</strong>
        </p>
        {carregando ? (
          <Skeleton height="120px" borderRadius="8px" />
        ) : erro ? (
          <div className="modal-alert error" role="alert">⚠ {erro.message}</div>
        ) : (
          <ListaAuditoria registros={dados} />
        )}
      </div>
    </Modal>
  )
}
