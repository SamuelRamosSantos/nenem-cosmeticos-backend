// Mesmo arredondamento de frontend/src/services/financeiroService.js#arredondar
// — precisa ser idêntico dos dois lados pra não gerar centavos divergentes
// entre uma venda feita no mobile e uma feita na web.
function arredondar(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

module.exports = arredondar;
