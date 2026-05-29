require('dotenv').config();
const sequelize = require('./db');

// Importa todos os models
require('./models/usuarios');
require('./models/categorias');
require('./models/transacoes');

async function sincronizar() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco OK');

    await sequelize.sync({ force: false });
    console.log('Tabelas criadas/sincronizadas com sucesso');

    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

sincronizar();