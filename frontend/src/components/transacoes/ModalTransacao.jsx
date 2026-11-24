import { useState } from 'react'
import Modal from '../ui/Modal'
import { api } from '../../services/api'
import CampoMoeda from '../ui/CampoMoeda'
import { hojeISO } from '../../utils/datas'

function novaChave() {
  return `TX-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
}

/**
 * Formulário de criação/edição. É montado só quando aberto,
 * então o estado inicial vem direto das props (sem efeitos).
 */
export default function ModalTransacao({ transacao, tipoInicial = 'ENTRADA', onFechar, onSalvo }) {
  const editando = Boolean(transacao)

  const [tipo, setTipo] = useState(transacao?.tipo ?? tipoInicial)
  const [descricao, setDescricao] = useState(transacao?.descricao ?? '')
  const [valorCentavos, setValorCentavos] = useState(transacao?.valorCentavos ?? 0)
  const [data, setData] = useState(transacao ? transacao.dataTransacao.slice(0, 10) : hojeISO())
  const [chaveUnica, setChaveUnica] = useState(novaChave)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setErro('')

    if (!descricao.trim()) return setErro('Por favor, informe a descrição.')
    if (valorCentavos <= 0) return setErro('Informe um valor maior que zero.')

    const dados = { tipo, descricao: descricao.trim(), valorCentavos, dataTransacao: data }

    setSalvando(true)
    try {
      if (editando) {
        await api.atualizarTransacao(transacao.id, dados)
        onSalvo('Transação atualizada (alteração registrada na auditoria).')
      } else {
        await api.criarTransacao({ ...dados, chaveUnica: chaveUnica.trim() })
        onSalvo('Transação cadastrada com sucesso!')
      }
    } catch (err) {
      setErro(err.status === 409
        ? 'Lançamento duplicado! Uma transação com esta chave única já foi cadastrada.'
        : err.message || 'Erro ao processar a operação.')
      setSalvando(false)
    }
  }

  return (
    <Modal titulo={editando ? 'Editar Lançamento' : 'Novo Lançamento de Caixa'} onFechar={onFechar}>
      <form onSubmit={salvar}>
        <div className="modal-body">
          {erro && <div className="modal-alert error" role="alert">⚠ {erro}</div>}

          <div className="form-group">
            <label>Tipo da Operação</label>
            <div className="type-selector">
              <button type="button" className={`type-btn entrada ${tipo === 'ENTRADA' ? 'active' : ''}`} onClick={() => setTipo('ENTRADA')}>
                + ENTRADA (Receita)
              </button>
              <button type="button" className={`type-btn saida ${tipo === 'SAIDA' ? 'active' : ''}`} onClick={() => setTipo('SAIDA')}>
                − SAÍDA (Despesa)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tx-descricao">Descrição do Lançamento</label>
            <input
              id="tx-descricao"
              type="text"
              className="form-input"
              placeholder="Ex: Pagamento de Aluguel, Venda de Mercadorias..."
              maxLength={255}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tx-valor">Valor em Reais (R$)</label>
            <CampoMoeda id="tx-valor" className="form-input" centavos={valorCentavos} onChange={setValorCentavos} required />
            <span className="input-hint">
              Digite apenas números: 200000 vira R$ 2.000,00. Guardado em centavos inteiros; valores negativos não são permitidos.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="tx-data">Data da Transação</label>
            <input id="tx-data" type="date" className="form-input" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>

          {!editando && (
            <div className="form-group">
              <label htmlFor="tx-chave">Chave Única de Idempotência</label>
              <input id="tx-chave" type="text" className="form-input" maxLength={100} value={chaveUnica} onChange={(e) => setChaveUnica(e.target.value)} required />
              <span className="input-hint">Evita lançamentos duplicados caso o botão seja clicado mais de uma vez.</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn-modal-submit" disabled={salvando}>
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Registrar Lançamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
