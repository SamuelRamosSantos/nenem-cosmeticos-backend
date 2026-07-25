const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

// Nunca inclui "senha" na resposta — a tela de gestão de usuários fala
// direto com essas rotas (sem cópia local, ver NC-68).
const SELECT_SEM_SENHA = {
  id: true, nome: true, ativo: true, created_at: true, updated_at: true,
};

// Mesma regra aplicada no app (utils/senha.js) — nunca confiar só na
// validação do cliente.
const REGEX_SENHA_FORTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const MENSAGEM_REGRA_SENHA =
  'A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.';

const listar = async (req, res, next) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { deleted: false },
      select: SELECT_SEM_SENHA,
      orderBy: { nome: 'asc' },
    });
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { nome, senha } = req.body;
    if (!nome?.trim() || !senha) {
      return res.status(400).json({ error: 'Os campos nome e senha são obrigatórios.' });
    }
    if (!REGEX_SENHA_FORTE.test(senha)) {
      return res.status(400).json({ error: MENSAGEM_REGRA_SENHA });
    }

    const duplicado = await prisma.usuario.findFirst({
      where: { deleted: false, nome: { equals: nome.trim(), mode: 'insensitive' } },
    });
    if (duplicado) {
      return res.status(409).json({ error: 'Já existe um usuário com este nome.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await prisma.usuario.create({
      data: { nome: nome.trim(), senha: senhaHash, ativo: true },
      select: SELECT_SEM_SENHA,
    });
    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
};

// Parcial: nome/senha/ativo são todos opcionais. Senha só é trocada se vier
// preenchida — nunca é lida de volta, então a tela nunca precisa (nem pode)
// pré-preencher o campo ao editar.
const atualizar = async (req, res, next) => {
  try {
    const { nome, senha, ativo } = req.body;
    const data = {};

    if (nome !== undefined) {
      if (!nome.trim()) {
        return res.status(400).json({ error: 'O nome não pode ficar vazio.' });
      }
      const duplicado = await prisma.usuario.findFirst({
        where: {
          deleted: false,
          id: { not: req.params.id },
          nome: { equals: nome.trim(), mode: 'insensitive' },
        },
      });
      if (duplicado) {
        return res.status(409).json({ error: 'Já existe um usuário com este nome.' });
      }
      data.nome = nome.trim();
    }

    if (senha) {
      if (!REGEX_SENHA_FORTE.test(senha)) {
        return res.status(400).json({ error: MENSAGEM_REGRA_SENHA });
      }
      data.senha = await bcrypt.hash(senha, 10);
    }

    if (ativo !== undefined) {
      data.ativo = ativo;
    }

    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data,
      select: SELECT_SEM_SENHA,
    });
    res.json(usuario);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, criar, atualizar };
