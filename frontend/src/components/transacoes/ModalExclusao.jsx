import { useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../services/api'

export default function ModalExclusao({ transacao, onFechar, onExcluido, onErro }) {
  const [excluindo, setExcluindo] = useState(false)

  async function confirmar() {
    setExcluindo(true)
    try {
      await api.excluirTransacao(transacao.id)
      onExcluido('Transação excluída (Soft Delete registrado na auditoria).')
    } catch (err) {
      onErro(err.message || 'Erro ao excluir transação.')
      setExcluindo(false)
    }
  }

  return (
    <Modal
      titulo="Confirmar Exclusão"
      corTitulo="var(--red)"
      onFechar={onFechar}
      rodape={
        <>
          <button type="button" className="btn-modal-cancel" onClick={onFechar}>Cancelar</button>
          <button type="button" className="btn-modal-submit" style={{ background: 'var(--red)' }} onClick={confirmar} disabled={excluindo}>
            {excluindo ? 'Excluindo...' : 'Confirmar Soft Delete'}
          </button>
        </>
      }
    >
      <div className="modal-body">
        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          Deseja realmente excluir o lançamento <strong>"{transacao.descricao}"</strong> no valor de <strong>{transacao.valorFormatado}</strong>?
        </p>
        <div className="modal-alert error" style={{ fontSize: '0.78rem' }}>
          🔒 <strong>Regra de Ouro (H1):</strong> o registro passa por exclusão lógica (Soft Delete). Ele não é apagado do banco de dados, garantindo a rastreabilidade e a auditoria.
        </div>
      </div>
    </Modal>
  )
}
