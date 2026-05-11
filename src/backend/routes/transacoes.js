const express = require('express')
const { getTransacoes } = require('../controllers/transacoesController')
const { autenticar } = require('../middleware/auth')

const router = express.Router()

router.get('/', autenticar, getTransacoes)

module.exports = router
