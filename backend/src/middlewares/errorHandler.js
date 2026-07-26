const ApiError = require('../utils/apiError');

// Formato único de erro (NC-108): { error: <mensagem>, code: <string estável> }.
// `code` deixa o cliente web decidir o tratamento sem parsear a mensagem
// (que é só para exibição/log); `error` continua igual ao que já existia,
// então nada que já lê `data.error` (ex.: apiClient.js do mobile) quebra.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado.', code: 'NOT_FOUND' });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Registro duplicado: violação de unicidade.', code: 'DUPLICATE' });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Referência inválida: chave estrangeira não encontrada.', code: 'INVALID_REFERENCE' });
  }

  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor.';
  res.status(status).json({ error: message, code: status === 500 ? 'INTERNAL_ERROR' : 'ERROR' });
}

module.exports = errorHandler;
