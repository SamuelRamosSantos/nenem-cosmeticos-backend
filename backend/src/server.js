require('dotenv/config');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const ApiError = require('./utils/apiError');

const app = express();
const PORT = process.env.PORT || 3000;

// Segurança e parsing
app.use(helmet());

// CORS (NC-129) — whitelist explícita agora que o frontend web (Vercel) também
// consome a API diretamente; antes só o app mobile usava este servidor, e
// requisições nativas (fetch do React Native) não enviam header Origin, então
// nunca precisaram de CORS. WEB_ORIGIN permite sobrescrever o domínio de
// produção via env var sem alterar código. Preview deployments da Vercel
// seguem o padrão <nome-do-projeto>-<hash-ou-branch>-<team>.vercel.app.
const WEB_PROD_ORIGIN = process.env.WEB_ORIGIN || 'https://nenemcosmeticos.vercel.app';
const WEB_PREVIEW_ORIGIN_REGEX = /^https:\/\/nenem-cosmeticos-web-[a-z0-9-]+\.vercel\.app$/;
const DEV_ORIGINS = ['http://localhost:5173'];

app.use(cors({
  origin(origin, callback) {
    // Sem Origin = cliente não-navegador (app mobile, curl, servidor-a-servidor) — libera.
    if (!origin) return callback(null, true);
    if (origin === WEB_PROD_ORIGIN) return callback(null, true);
    if (WEB_PREVIEW_ORIGIN_REGEX.test(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && DEV_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new ApiError(403, `Origem não permitida pelo CORS: ${origin}`, 'FORBIDDEN_ORIGIN'));
  },
  // Sem credentials: true por enquanto — o JWT viaja via header Authorization,
  // não cookie. Revisar se a NC-113 (armazenamento do token) optar por cookie httpOnly.
}));

// AUMENTANDO O LIMITE DE TAMANHO DA REQUISIÇÃO PARA 50MB 👇
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Rotas da API
app.use('/api', routes);

// Tratamento centralizado de erros (deve ser o último middleware)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;