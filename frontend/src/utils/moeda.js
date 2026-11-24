/** Maior valor aceito pela API (limite da coluna INTEGER): R$ 21.474.836,47 */
export const MAX_CENTAVOS = 2_147_483_647

/**
 * Máscara de moeda: considera apenas os dígitos digitados, como numa maquininha.
 * "200000" -> 200000 centavos (R$ 2.000,00). Elimina a ambiguidade entre ponto e vírgula.
 * @param {string} texto
 * @returns {number} centavos inteiros
 */
export function centavosDoTexto(texto) {
  const digitos = String(texto).replace(/\D/g, '').slice(0, 10)
  return Math.min(Number(digitos || 0), MAX_CENTAVOS)
}

/** 200000 -> "2.000,00" (sem o símbolo, para o campo do formulário) */
export function formatarCentavos(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Centavos -> "R$ 2.000,00" */
export function formatarReal(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Centavos -> rótulo curto de eixo: "R$ 0", "R$ 500", "R$ 2 mil", "R$ 1,5 mi" */
export function formatarRealCurto(centavos) {
  const reais = centavos / 100
  if (Math.abs(reais) >= 1_000_000) return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (Math.abs(reais) >= 1_000) return `R$ ${(reais / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}
