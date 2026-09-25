import { useEffect, useRef, useState } from 'react'

const menosMovimento = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// "R$ 12.450,00" -> { prefixo: 'R$ ', numero: 12450, casas: 2, sufixo: '' }
function separar(texto) {
  const match = String(texto).match(/^(\D*)([\d.,]+)(.*)$/)
  if (!match) return null

  const [, prefixo, corpo, sufixo] = match
  const numero = Number(corpo.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(numero)) return null

  const casas = corpo.includes(',') ? corpo.split(',')[1].length : 0
  return { prefixo, numero, casas, sufixo }
}

function formatar({ prefixo, casas, sufixo }, valor) {
  const numero = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
  return `${prefixo}${numero}${sufixo}`
}

/** Mostra um valor monetário contando de zero até o total. */
export default function ValorAnimado({ texto, duracao = 1200, className }) {
  const partes = separar(texto)
  // Começa em zero já na primeira pintura, para não piscar o valor final antes de contar
  const [valor, setValor] = useState(() => (partes && !menosMovimento() ? 0 : null))
  const quadro = useRef(0)

  useEffect(() => {
    if (!partes || menosMovimento()) return

    let inicio = null
    const passo = (agora) => {
      inicio ??= agora
      const progresso = Math.min((agora - inicio) / duracao, 1)
      // easeOutCubic: rápido no começo, suave no fim
      setValor(partes.numero * (1 - (1 - progresso) ** 3))
      if (progresso < 1) quadro.current = requestAnimationFrame(passo)
    }

    quadro.current = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro.current)
    // partes vem do texto; recriá-lo a cada render não deve reiniciar a contagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, duracao])

  const conteudo = partes && valor !== null ? formatar(partes, valor) : texto

  return <span className={className}>{conteudo}</span>
}
