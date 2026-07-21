const jwt = require('jsonwebtoken');

// Protege rotas administrativas exigindo "Authorization: Bearer <token>".
// Não é aplicado em /sync — o app mobile ainda não envia token (NC-68/69).
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token não informado.' });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

module.exports = autenticar;
