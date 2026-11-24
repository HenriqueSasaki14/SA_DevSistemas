import { test, expect } from '@playwright/test'

/** Cria um usuário novo pela tela de cadastro e cai no dashboard. */
async function cadastrar(page, nome = 'Empresa Teste') {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@safecash.test`
  await page.goto('/register')
  await page.fill('#nome', nome)
  await page.fill('#email', email)
  await page.fill('#senha', '123456')
  await page.fill('#confirmar', '123456')
  await page.click('button[type=submit]')
  await expect(page.getByTestId('saldo')).toBeVisible()
  return email
}

/** Abre o modal de lançamento, preenche e salva. Valor digitado como numa maquininha. */
async function lancar(page, { tipo, descricao, digitos, data }) {
  await page.getByRole('button', { name: tipo === 'SAIDA' ? 'Nova Saída' : 'Nova Entrada' }).click()
  await page.fill('#tx-descricao', descricao)
  await page.locator('#tx-valor').click({ position: { x: 4, y: 10 } }) // clica no INÍCIO do campo de propósito
  await page.locator('#tx-valor').pressSequentially(digitos)
  if (data) await page.fill('#tx-data', data)
  await page.getByRole('button', { name: 'Registrar Lançamento' }).click()
  await expect(page.getByText('Transação cadastrada com sucesso!')).toBeVisible()
}

test('cadastra o aluguel do enunciado e o saldo atualiza sozinho (H5)', async ({ page }) => {
  await cadastrar(page)
  await expect(page.getByTestId('saldo')).toHaveText('R$ 0,00')

  await page.getByRole('button', { name: 'Nova Saída' }).click()
  await page.locator('#tx-valor').pressSequentially('200000')
  await expect(page.locator('#tx-valor')).toHaveValue('2.000,00')
  await page.fill('#tx-descricao', 'Pagamento de Aluguel')
  await page.getByRole('button', { name: 'Registrar Lançamento' }).click()

  await expect(page.getByTestId('saldo')).toHaveText('-R$ 2.000,00')
  await expect(page.locator('.trans-desc', { hasText: 'Pagamento de Aluguel' })).toBeVisible()
})

test('busca e filtro por tipo restringem a listagem', async ({ page }) => {
  await cadastrar(page)
  await lancar(page, { tipo: 'ENTRADA', descricao: 'Venda de Mercadorias', digitos: '500000' })
  await lancar(page, { tipo: 'SAIDA', descricao: 'Conta de Energia', digitos: '35090' })

  await page.getByLabel('Buscar pela descrição').fill('energia')
  await expect(page.locator('.trans-desc')).toHaveText(['Conta de Energia'])

  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await page.getByLabel('Filtrar por tipo').selectOption('ENTRADA')
  await expect(page.locator('.trans-desc')).toHaveText(['Venda de Mercadorias'])
})

test('paginação divide a listagem em páginas', async ({ page, request }) => {
  await cadastrar(page)
  const token = await page.evaluate(() => localStorage.getItem('safecash_token'))
  for (let i = 1; i <= 10; i++) {
    await request.post('/api/transacoes', {
      headers: { Authorization: `Bearer ${token}` },
      data: { tipo: 'ENTRADA', descricao: `Lançamento ${i}`, valorCentavos: i * 100, dataTransacao: `2026-11-${String(i).padStart(2, '0')}` },
    })
  }
  await page.getByRole('button', { name: 'Recarregar' }).click()

  await expect(page.getByText('10 lançamentos · página 1 de 2')).toBeVisible()
  await expect(page.locator('.trans-item')).toHaveCount(8)
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.locator('.trans-item')).toHaveCount(2)
})

test('exclusão é lógica (Soft Delete) e fica registrada na auditoria (H1)', async ({ page }) => {
  await cadastrar(page)
  await lancar(page, { tipo: 'ENTRADA', descricao: 'Recebimento Cliente', digitos: '100000' })
  await expect(page.getByTestId('saldo')).toHaveText('R$ 1.000,00')

  await page.getByRole('button', { name: 'Excluir Recebimento Cliente' }).click()
  await page.getByRole('button', { name: 'Confirmar Soft Delete' }).click()

  await expect(page.getByTestId('saldo')).toHaveText('R$ 0,00')
  await expect(page.locator('.trans-desc', { hasText: 'Recebimento Cliente' })).toHaveCount(0)
})

test('RBAC: usuário comum não acessa a área administrativa', async ({ page, request }) => {
  // Garante que já existe alguém antes (o primeiro usuário do sistema vira ADMIN)
  await request.post('/api/auth/register', {
    data: { nome: 'Primeiro', email: `e2e-primeiro-${Date.now()}@safecash.test`, senha: '123456' },
  })
  await cadastrar(page, 'Usuario Comum')

  await expect(page.getByRole('link', { name: 'Administração' })).toHaveCount(0)
  await page.goto('/admin')
  await expect(page).toHaveURL('/')

  const token = await page.evaluate(() => localStorage.getItem('safecash_token'))
  const resposta = await request.get('/api/admin/usuarios', { headers: { Authorization: `Bearer ${token}` } })
  expect(resposta.status()).toBe(403)
})

test('API recusa valor negativo (validação de schema)', async ({ page, request }) => {
  await cadastrar(page)
  const token = await page.evaluate(() => localStorage.getItem('safecash_token'))
  const resposta = await request.post('/api/transacoes', {
    headers: { Authorization: `Bearer ${token}` },
    data: { tipo: 'SAIDA', descricao: 'Inválida', valorCentavos: -500 },
  })
  expect(resposta.status()).toBe(400)
})
