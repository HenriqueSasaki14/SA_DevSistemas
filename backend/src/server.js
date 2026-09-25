import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.ts'

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());


app.post('/api/auth/register', async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos' })
    }

    const jaExiste = await prisma.usuario.findUnique({
        where: { email },
        select: { id_usuario: true }
    })
    if (jaExiste) {
        return res.status(400).json({ erro: 'E-mail já cadastrado' })
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10)
    const usuario = await prisma.usuario.create({
        data: {
            nome,
            email,
            senha: senhaCriptografada
        },
        select: { id_usuario: true, nome: true, email: true }
    })

    const token = gerarToken(usuario)

    res.status(201).json({ token, usuario })
})

app.listen(PORT, () => console.log(`Servidor rodando na porta 3000`));