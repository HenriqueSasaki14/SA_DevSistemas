// GET /api/transacoes  (req.usuario injetado pelo middleware autenticar)
async function getTransacoes(req, res) {
  // TODO: buscar transações do usuário req.usuario.id no banco de dados
  // Ordenar por data decrescente (mais recente primeiro)
  // Suporte opcional a paginação: req.query.page, req.query.limit

  // Campos obrigatórios em cada item retornado:
  //   desc  — string: descrição da transação
  //   data  — string: data formatada "DD/MM/AAAA"
  //   val   — string: valor formatado, ex: "+R$ 3.200,00" ou "-R$ 1.450,00"
  //   tipo  — enum: "entrada" | "saida" | "rendimento" | "tarifa"

  // Stub — remover após integrar o banco (pode retornar [] também, o frontend trata):
  return res.json([])
}

module.exports = { getTransacoes }
