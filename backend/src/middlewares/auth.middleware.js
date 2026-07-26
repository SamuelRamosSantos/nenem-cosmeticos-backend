const jwt = require('jsonwebtoken');
const ApiError = require('../utils/apiError');

// Exige "Authorization: Bearer <token>" em toda rota exceto /auth — incluindo
// /sync (ver routes/index.js, a fonte confiável; o app mobile já envia token
// desde NC-67/68/69, apesar do que comentários antigos deste arquivo diziam).
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'Token não informado.', 'UNAUTHORIZED'));
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return next(new ApiError(401, 'Token inválido ou expirado.', 'UNAUTHORIZED'));
  }
}

module.exports = autenticar;
