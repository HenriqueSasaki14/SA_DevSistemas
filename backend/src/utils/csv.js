/** Escapa um valor para CSV (separador ;, padrão do Excel em português). */
function celula(valor) {
  const texto = String(valor ?? '')
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/**
 * Gera um CSV com BOM UTF-8 (acentos corretos no Excel).
 * @param {string[]} cabecalho
 * @param {Array<Array<unknown>>} linhas
 */
export function gerarCsv(cabecalho, linhas) {
  const conteudo = [cabecalho, ...linhas].map((linha) => linha.map(celula).join(';')).join('\r\n')
  return `﻿${conteudo}\r\n`
}
