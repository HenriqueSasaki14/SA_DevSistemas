import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.ts';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'troque_esta_chave_secreta';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

function autenticar(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [tipo, token] = authHeader.split(' '); // Adicionei o espaço aqui

    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({ erro: 'token nao enviado' });
    }

    try {
        const dados = jwt.verify(token, JWT_SECRET);
        req.usuarioId = dados.id;
        next();
    } catch(error) {
        return res.status(401).json({ error: 'token invalido ou expirado' }); // Corrigi o res.status
    }
}

const formatarMoeda = (valor) =>{
    return new Intl.NumberFormat('pt-BR', {style:
        'currency', currency: 'BRL'
    }).format(valor);
};

app.get('api/dashboard'), autenticar, async (req,res)=>{
    try{
        const trasacoes = await prisma.transacao.findMany({
            where: {usuario_id: req.usuarioId}
        });

        let totalReceitas = 0;
        let totalDespesas = 0;
        let totalInvestimentos = 0;

        
    }
}
app.listen(PORT, () => console.log(`Servidor rodando na porta 3000`));