/**
 * Formata centavos inteiros para Real (ex: 200000 -> "R$ 2.000,00").
 * @param {number} centavos
 * @returns {string}
 */
export function formatarCentavosParaReal(centavos) {
  return ((centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
