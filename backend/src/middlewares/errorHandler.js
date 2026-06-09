function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado.' });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Registro duplicado: violação de unicidade.' });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Referência inválida: chave estrangeira não encontrada.' });
  }

  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor.';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
