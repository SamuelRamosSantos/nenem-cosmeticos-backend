// Opções do cookie httpOnly que carrega o JWT da web (NC-113). Centralizado
// aqui porque `res.clearCookie()` só remove o cookie se receber exatamente os
// mesmos atributos (path/sameSite/secure) usados em `res.cookie()` — nunca
// duplique esses valores entre login/logout.
//
// secure/sameSite variam por ambiente: em produção o frontend (Vercel) e o
// backend (Render) são domínios diferentes — cookie cross-site exige
// SameSite=None, que por sua vez exige Secure (só funciona em HTTPS). Em dev
// local (backend em http://localhost), Secure quebraria o cookie inteiro, daí
// cair para Lax + secure:false (funciona via proxy same-origin do Vite, ver
// web/vite.config.ts).
const isProd = process.env.NODE_ENV === 'production';

const COOKIE_NAME = 'token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
  // Mantido em sincronia manualmente com JWT_EXPIRES_IN (default '24h') —
  // não há parser de duração aqui pra não puxar mais uma dependência.
  maxAge: 24 * 60 * 60 * 1000,
};

module.exports = { COOKIE_NAME, COOKIE_OPTIONS };
