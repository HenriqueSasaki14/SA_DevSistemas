const express = require('express')
const { me } = require('../controllers/authController')
const { autenticar } = require('../middleware/auth')

const router = express.Router()

router.get('/', autenticar, me)

module.exports = router
