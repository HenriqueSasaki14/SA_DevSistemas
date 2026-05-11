const express = require('express')
const { getDashboard } = require('../controllers/dashboardController')
const { autenticar } = require('../middleware/auth')

const router = express.Router()

router.get('/', autenticar, getDashboard)

module.exports = router
