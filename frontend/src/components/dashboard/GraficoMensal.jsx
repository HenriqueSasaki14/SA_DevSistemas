import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatarReal, formatarRealCurto } from '../../utils/moeda'
import { formatarMes } from '../../utils/datas'

const ALTURA = 240
const MARGEM = { topo: 12, direita: 8, base: 28, esquerda: 64 }
const GAP_BARRAS = 2
const RAIO = 4
const SERIES = [
  { chave: 'entradasCentavos', rotulo: 'Entradas', cor: 'var(--green)' },
  { chave: 'saidasCentavos', rotulo: 'Saídas', cor: 'var(--red)' },
]

/** Arredonda o topo do eixo para um valor "redondo" (1, 2, 2,5, 5 × 10^n). */
function escalaY(maximo, divisoes = 4) {
  if (maximo <= 0) return { topo: 100000, passo: 25000 }
  const bruto = maximo / divisoes
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto)
  return { topo: passo * divisoes, passo }
}

/** Barra com topo arredondado (4px) e base reta, ancorada na linha zero. */
function caminhoBarra(x, y, largura, altura) {
  if (altura <= 0) return ''
  const r = Math.min(RAIO, largura / 2, altura)
  return `M${x},${y + altura}V${y + r}Q${x},${y} ${x + r},${y}H${x + largura - r}Q${x + largura},${y} ${x + largura},${y + r}V${y + altura}Z`
}

function GraficoMensal({ meses }) {
  const containerRef = useRef(null)
  const [largura, setLargura] = useState(600)
  const [ativo, setAtivo] = useState(null)
  const [verTabela, setVerTabela] = useState(false)

  // Mede o container para o SVG ocupar a largura disponível (responsivo)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entrada]) => setLargura(Math.max(280, entrada.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [verTabela]) // o container é recriado ao voltar da visão em tabela

  const geometria = useMemo(() => {
    const maximo = Math.max(0, ...meses.flatMap((m) => [m.entradasCentavos, m.saidasCentavos]))
    const { topo, passo } = escalaY(maximo)
    const plotL = largura - MARGEM.esquerda - MARGEM.direita
    const plotA = ALTURA - MARGEM.topo - MARGEM.base
    const banda = plotL / meses.length
    const larguraBarra = Math.min(28, (banda * 0.6 - GAP_BARRAS) / 2)
    const y = (v) => MARGEM.topo + plotA - (v / topo) * plotA
    const ticks = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo)
    return { plotA, banda, larguraBarra, y, ticks }
  }, [meses, largura])

  const { plotA, banda, larguraBarra, y, ticks } = geometria
  const semDados = meses.every((m) => m.entradasCentavos === 0 && m.saidasCentavos === 0)
  const mesAtivo = ativo !== null ? meses[ativo] : null
  const resumo = meses.map((m) => `${formatarMes(m.mes)}: entradas ${m.entradas}, saídas ${m.saidas}`).join('; ')

  return (
    <div className="card grafico-card">
      <div className="card-header-actions">
        <div>
          <p className="card-title" style={{ margin: 0 }}>Entradas × Saídas por mês</p>
          <p className="grafico-sub">Últimos {meses.length} meses · somente transações ativas</p>
        </div>
        <button type="button" className="btn-pag" onClick={() => setVerTabela((v) => !v)} aria-pressed={verTabela}>
          {verTabela ? '📊 Ver gráfico' : '▦ Ver tabela'}
        </button>
      </div>

      <div className="grafico-legenda" aria-hidden={verTabela}>
        {SERIES.map((s) => (
          <span key={s.chave} className="legenda-item">
            <span className="legenda-cor" style={{ background: s.cor }} />{s.rotulo}
          </span>
        ))}
      </div>

      {verTabela ? (
        <div className="tabela-scroll">
          <table className="tabela">
            <thead><tr><th>Mês</th><th className="num">Entradas</th><th className="num">Saídas</th><th className="num">Saldo do mês</th></tr></thead>
            <tbody>
              {meses.map((m) => (
                <tr key={m.mes}>
                  <td>{formatarMes(m.mes)}</td>
                  <td className="num">{m.entradas}</td>
                  <td className="num">{m.saidas}</td>
                  <td className="num">{m.saldo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grafico-area" ref={containerRef} onMouseLeave={() => setAtivo(null)}>
          <svg width={largura} height={ALTURA} role="img" aria-label={`Gráfico de entradas e saídas por mês. ${resumo}`}>
            {/* Grade e eixo Y (recessivos) */}
            {ticks.map((v) => (
              <g key={v}>
                <line x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(v)} y2={y(v)}
                  stroke="var(--border)" strokeWidth="1" strokeDasharray={v === 0 ? undefined : '2 3'} />
                <text x={MARGEM.esquerda - 8} y={y(v)} dy="0.32em" textAnchor="end" className="grafico-eixo">
                  {formatarRealCurto(v)}
                </text>
              </g>
            ))}

            {meses.map((m, i) => {
              const xBanda = MARGEM.esquerda + i * banda
              const xCentro = xBanda + banda / 2
              return (
                <g key={m.mes}>
                  {ativo === i && <rect x={xBanda + 2} y={MARGEM.topo} width={banda - 4} height={plotA} rx="6" fill="var(--bg)" />}
                  {SERIES.map((s, j) => {
                    const valor = m[s.chave]
                    const x = xCentro - larguraBarra - GAP_BARRAS / 2 + j * (larguraBarra + GAP_BARRAS)
                    return <path key={s.chave} d={caminhoBarra(x, y(valor), larguraBarra, y(0) - y(valor))} fill={s.cor} />
                  })}
                  <text x={xCentro} y={ALTURA - 8} textAnchor="middle" className="grafico-eixo">{formatarMes(m.mes)}</text>
                  {/* Área de interação maior que as barras (mouse, toque e teclado) */}
                  <rect
                    x={xBanda} y={MARGEM.topo} width={banda} height={plotA} fill="transparent"
                    tabIndex={0} aria-label={`${formatarMes(m.mes)}: entradas ${m.entradas}, saídas ${m.saidas}, saldo ${m.saldo}`}
                    onMouseEnter={() => setAtivo(i)} onFocus={() => setAtivo(i)} onBlur={() => setAtivo(null)}
                    onClick={() => setAtivo(i)}
                  />
                </g>
              )
            })}
          </svg>

          {semDados && <div className="grafico-vazio">Sem movimentação no período.</div>}

          {mesAtivo && (
            <div
              className="grafico-tooltip"
              style={{
                left: Math.min(MARGEM.esquerda + ativo * banda + banda / 2, largura - 90),
                top: MARGEM.topo,
              }}
            >
              <strong>{formatarMes(mesAtivo.mes)}</strong>
              {SERIES.map((s) => (
                <span key={s.chave} className="tooltip-linha">
                  <span className="legenda-cor" style={{ background: s.cor }} />{s.rotulo}
                  <span className="tooltip-valor">{formatarReal(mesAtivo[s.chave])}</span>
                </span>
              ))}
              <span className="tooltip-linha tooltip-saldo">
                Saldo<span className="tooltip-valor">{mesAtivo.saldo}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(GraficoMensal)
