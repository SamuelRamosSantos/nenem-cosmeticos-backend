const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const listar = async (req, res, next) => {
  try {
    const { tipo, busca } = req.query;
    const where = { deleted: false };
    if (tipo) where.tipo = tipo;
    if (busca?.trim()) where.nome = { contains: busca.trim(), mode: 'insensitive' };

    const { page, pageSize, skip, take, orderBy } = parsePagination(req.query, {
      defaultSortBy: 'nome',
      allowedSortBy: ['nome', 'created_at'],
    });

    const [pessoas, total] = await Promise.all([
      prisma.pessoa.findMany({ where, orderBy, skip, take }),
      prisma.pessoa.count({ where }),
    ]);
    res.json({ data: pessoas, pagination: buildPaginationMeta({ page, pageSize, total }) });
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const pessoa = await prisma.pessoa.findFirst({
      where: { id: req.params.id, deleted: false },
    });
    if (!pessoa) throw new ApiError(404, 'Pessoa não encontrada.', 'NOT_FOUND');
    res.json(pessoa);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { nome, telefone, tipo } = req.body;
    if (!nome || !tipo) {
      throw new ApiError(400, 'Os campos nome e tipo são obrigatórios.', 'VALIDATION_ERROR');
    }
    const pessoa = await prisma.pessoa.create({ data: { nome, telefone, tipo } });
    res.status(201).json(pessoa);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { nome, telefone, tipo } = req.body;
    const pessoa = await prisma.pessoa.update({
      where: { id: req.params.id },
      data: { nome, telefone, tipo },
    });
    res.json(pessoa);
  } catch (err) {
    next(err);
  }
};

// NC-81 (regra herdada do mobile, agora aplicada no servidor): só permite
// excluir pessoa sem movimentação vinculada — vendas, movimentações de
// estoque ou títulos (o financeiro não existia quando a regra nasceu no app;
// hoje existe, então entra na checagem). Excluir com vínculo quebraria o
// histórico. Pessoa não tem campo `ativo`, então não há opção de inativar.
const remover = async (req, res, next) => {
  try {
    const [qtdVendas, qtdCompras, qtdMovimentacoes, qtdTitulos] = await Promise.all([
      prisma.vendaHeader.count({ where: { cliente_id: req.params.id, deleted: false } }),
      prisma.compraHeader.count({ where: { fornecedor_id: req.params.id, deleted: false } }),
      prisma.estoqueMovimentacao.count({ where: { pessoa_id: req.params.id, deleted: false } }),
      prisma.titulo.count({ where: { cliente_id: req.params.id, deleted: false } }),
    ]);

    if (qtdVendas > 0 || qtdCompras > 0 || qtdMovimentacoes > 0 || qtdTitulos > 0) {
      throw new ApiError(
        409,
        'Este cadastro possui vendas, compras, movimentações de estoque ou títulos vinculados e não pode ser excluído — isso quebraria o histórico.',
        'HAS_REFERENCES'
      );
    }

    await prisma.pessoa.update({
      where: { id: req.params.id },
      data: { deleted: true },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, remover };
