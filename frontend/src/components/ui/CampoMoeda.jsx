import { useLayoutEffect, useRef } from 'react'
import { centavosDoTexto, formatarCentavos } from '../../utils/moeda'

/**
 * Campo de valor com máscara de R$ (como maquininha: os dígitos entram pela direita).
 * O cursor fica sempre no final; assim, clicar no início do campo não embaralha o valor.
 */
export default function CampoMoeda({ centavos, onChange, ...props }) {
  const ref = useRef(null)
  const texto = formatarCentavos(centavos)

  const cursorNoFim = () => {
    const el = ref.current
    if (el && document.activeElement === el) el.setSelectionRange(el.value.length, el.value.length)
  }

  // Depois de cada mudança de valor, devolve o cursor para o final
  useLayoutEffect(cursorNoFim, [texto])

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={texto}
      onChange={(e) => onChange(centavosDoTexto(e.target.value))}
      onFocus={() => { cursorNoFim(); requestAnimationFrame(cursorNoFim) }}
      onClick={cursorNoFim}
      onKeyDown={cursorNoFim} // antes de o caractere ser inserido
      onBeforeInput={cursorNoFim}
    />
  )
}
