const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// =============================================================================
// POST /api/auth/login
//
// Autenticação em nuvem (NC-67) — hoje usada apenas para acesso administrativo
// ao backend (Postman/futuro painel web). O app mobile continua com login
// 100% local (AuthContext.js); embutir esse token no fluxo do app é o NC-68/69,
// ainda não implementado.
// =============================================================================
const login = async (req, res, next) => {
  try {
    const { nome, senha } = req.body;

    if (!nome || !senha) {
      return res.status(400).json({ error: 'Informe usuário e senha.' });
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        ativo: true,
        deleted: false,
        nome: { equals: nome.trim(), mode: 'insensitive' },
      },
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    const token = jwt.sign(
      { sub: usuario.id, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
