const {DataTypes} = require('sequelize');
const sequelize = require('../db');

const categorias = sequelize.define('categorias', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    criado_quando: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = categorias;