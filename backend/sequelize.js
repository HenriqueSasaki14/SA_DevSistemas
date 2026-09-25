const { Sequelize } = require('sequelize')

// Conexão PostgreSQL usada pelos models (ainda não usada pelo server.js)
const sequelize = new Sequelize(process.env.DATABASE_URL, { logging: false })

module.exports = sequelize
