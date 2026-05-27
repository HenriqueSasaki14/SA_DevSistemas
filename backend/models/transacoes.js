const {DataTypes} = require('sequelize');
const sequelize = require('../db');

const transacoes = sequelize.define('transacoes', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id_usuario'
        }
    },
    categoria_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categorias',
            key: 'id'
        }
    },
    descricao: {
        type: DataTypes.STRING,
        allowNull: true
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    tipo: {
        type: DataTypes.STRING,
        allowNull: false        // 'entrada' ou 'saida'
    },
    data_transacao: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    atualizao_ultima: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    deleted_quando: {
        type: DataTypes.DATE,
        allowNull: true         // null = não deletado
    }
});

module.exports = transacoes;