// Erro de aplicação com status HTTP + código estável, para o errorHandler
// central formatar uma resposta consistente. `code` é pensado para o cliente
// web tratar por valor fixo (ex.: switch/if), sem parsear a mensagem em
// português — a mensagem (`error`) continua existindo para exibição/log.
class ApiError extends Error {
  constructor(status, message, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

module.exports = ApiError;
