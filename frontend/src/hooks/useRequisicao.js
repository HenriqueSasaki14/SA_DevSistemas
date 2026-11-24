import { useEffect, useState } from 'react'

/**
 * Executa uma busca na API sempre que `chave` muda.
 * `carregando` é derivado (chave pedida != chave recebida), sem setState síncrono no efeito.
 * @param {() => Promise<any>} buscar - função que faz a requisição
 * @param {string} chave - identifica a requisição (ex: JSON dos filtros + versão)
 */
export function useRequisicao(buscar, chave) {
  const [estado, setEstado] = useState({ chave: null, dados: null, erro: null })

  useEffect(() => {
    let ativo = true
    buscar()
      .then((dados) => ativo && setEstado({ chave, dados, erro: null }))
      .catch((erro) => ativo && setEstado((anterior) => ({ ...anterior, chave, erro })))
    return () => { ativo = false }
    // `buscar` muda a cada render; a chave é quem define quando buscar de novo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return { dados: estado.dados, erro: estado.erro, carregando: estado.chave !== chave }
}
