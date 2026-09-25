import express from 'express';
import cors from 'cors';
import {prisma} from './lib/prisma.ts'

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

app.listen(PORT, () => console.log(`Servidor rodando na porta 3000`));