/** Data de hoje no fuso local, no formato AAAA-MM-DD (usado no <input type="date">) */
export function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Primeiro dia do mês atual, AAAA-MM-DD */
export function inicioDoMesISO() {
  return `${hojeISO().slice(0, 8)}01`
}

/** Datas de transação são guardadas em UTC (meia-noite): exibe sem deslocar o dia */
export function formatarData(iso) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'
}

export function formatarDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR')
}

/** "2026-11" -> "nov/26" */
export function formatarMes(mes) {
  const [ano, m] = mes.split('-').map(Number)
  const nome = new Date(Date.UTC(ano, m - 1, 1)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
  return `${nome.replace('.', '')}/${String(ano).slice(2)}`
}

/** "terça-feira, 24 de novembro de 2026" */
export function formatarDataHoje() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}
