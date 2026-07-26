const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { COOKIE_NAME, COOKIE_OPTIONS } = require('../utils/authCookie');

// =============================================================================
// POST /api/auth/login
//
// Autenticação em nuvem (NC-67), único endpoint público (ver routes/index.js).
// Usada pelo login do app mobile (AuthContext.js, 100% em nuvem desde
// NC-68/69) — continua recebendo o `token` no corpo JSON, sem mudança.
//
// A web (NC-99/NC-112/NC-113) optou por cookie httpOnly em vez de guardar o
// token em localStorage/sessionStorage (mais seguro contra XSS). Por isso o
// mesmo endpoint agora TAMBÉM seta um cookie httpOnly com o token — dual-mode,
// não quebra o mobile (que ignora Set-Cookie e usa só o campo `token` do
// corpo). O client web deve ignorar `token` no corpo e confiar só no cookie.
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

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// POST /api/auth/logout
//
// Só existe por causa do cookie httpOnly da web (NC-113) — JS não consegue
// apagar um cookie httpOnly sozinho (`document.cookie` não enxerga esse
// cookie), então a limpeza precisa passar pelo servidor. O app mobile não usa
// isso — seu logout continua sendo local (deletar do SecureStore), sem
// chamada de API (JWT é stateless, não há sessão pra invalidar no servidor).
// =============================================================================
const logout = async (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.status(204).send();
};

// =============================================================================
// GET /api/auth/me  (protegido por `autenticar`)
//
// Existe só pra web (NC-99/NC-112): como o token vive num cookie httpOnly, o
// JS do navegador não consegue ler/decodificar o JWT pra saber se a sessão
// ainda é válida (é assim que o mobile faz, ver obterExpiracaoJwt no app — lá
// funciona porque o token fica em SecureStore, legível pelo próprio app). Web
// precisa perguntar pro servidor "quem sou eu" a cada carregamento de página.
// =============================================================================
const me = async (req, res) => {
  res.json({ usuario: { id: req.usuario.sub, nome: req.usuario.nome } });
};

module.exports = { login, logout, me };
