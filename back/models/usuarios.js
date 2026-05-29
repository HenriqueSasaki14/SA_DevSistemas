const {DataTypes} = require('sequelize');
const sequelize = require('../db');

const usuarios = sequelize.define('usuarios',{

    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,      
        autoIncrement: true,
    },

    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },

    senha: {
        type: DataTypes.STRING,
        allowNull: false
    },

    cpf: {
        type: DataTypes.STRING,
        allowNull: false

    },

    telefone: {
        type: DataTypes.STRING,
        allowNull: false
    },

    deleted: {
        type: DataTypes.DATE,
        allowNull: true
    },

});

module.exports = usuarios