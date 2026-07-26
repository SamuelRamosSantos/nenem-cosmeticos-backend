const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');

// =============================================================================
// POST /api/auth/login
//
// Autenticação em nuvem (NC-67), único endpoint público (ver routes/index.js).
// Usada pelo login do app mobile (AuthContext.js, 100% em nuvem desde
// NC-68/69) e será reusada pelo login web (NC-99/NC-112) sem alteração.
// =============================================================================
const login = async (req, res, next) => {
  try {
    const { nome, senha } = req.body;

    if (!nome || !senha) {
      throw new ApiError(400, 'Informe usuário e senha.', 'VALIDATION_ERROR');
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        ativo: true,
        deleted: false,
        nome: { equals: nome.trim(), mode: 'insensitive' },
      },
    });

    if (!usuario) {
      throw new ApiError(401, 'Usuário ou senha incorretos.', 'UNAUTHORIZED');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new ApiError(401, 'Usuário ou senha incorretos.', 'UNAUTHORIZED');
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
