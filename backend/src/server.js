require('dotenv/config');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const routes       = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// Segurança e parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

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
