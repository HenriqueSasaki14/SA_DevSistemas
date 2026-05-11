// GET /api/dashboard  (req.usuario injetado pelo middleware autenticar)
async function getDashboard(req, res) {
  // TODO: buscar dados financeiros do usuário req.usuario.id no banco de dados
  // Exemplos do que calcular/buscar:
  //   - saldo total da conta
  //   - variação percentual do saldo no mês
  //   - total de receitas e variação semanal
  //   - total de despesas e variação mensal
  //   - total investido e variação trimestral

  // O frontend exibe os valores exatamente como recebe (strings formatadas).
  // Formate no backend antes de retornar, ex:
  //   const fmt = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Stub — remover após integrar o banco:
  return res.json({
    saldoTotal:         'R$ 0,00',
    saldoDelta:         '+0% este mês',
    receitas:           'R$ 0,00',
    receitasDelta:      '+0% esta semana',
    despesas:           'R$ 0,00',
    despesasDelta:      '-0% este mês',
    investimentos:      'R$ 0,00',
    investimentosDelta: '+0% no trimestre',
  })
}

module.exports = { getDashboard }
