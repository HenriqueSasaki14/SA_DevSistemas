const UM_DIA_MS = 24 * 60 * 60 * 1000

/** "2026-11-22" -> Date 2026-11-22T00:00:00Z (datas de transação são guardadas em UTC). */
export function inicioDoDia(dataISO) {
  return new Date(`${dataISO}T00:00:00.000Z`)
}

/** Limite exclusivo do dia: "2026-11-22" -> 2026-11-23T00:00:00Z (para usar com `lt`). */
export function fimDoDiaExclusivo(dataISO) {
  return new Date(inicioDoDia(dataISO).getTime() + UM_DIA_MS)
}

/** Lista os últimos N meses no formato "AAAA-MM", terminando no mês de `referencia`. */
export function ultimosMeses(quantidade, referencia = new Date()) {
  const meses = []
  for (let i = quantidade - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth() - i, 1))
    meses.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

/** "2026-11" -> Date 2026-11-01T00:00:00Z */
export function inicioDoMes(mes) {
  return new Date(`${mes}-01T00:00:00.000Z`)
}
