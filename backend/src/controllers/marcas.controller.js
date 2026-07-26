const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const listar = async (req, res, next) => {
  try {
    const { busca } = req.query;
    const where = { deleted: false };
    if (busca?.trim()) where.nome = { contains: busca.trim(), mode: 'insensitive' };

    const { page, pageSize, skip, take, orderBy } = parsePagination(req.query, {
      defaultSortBy: 'nome',
      allowedSortBy: ['nome', 'created_at'],
    });

    const [marcas, total] = await Promise.all([
      prisma.marca.findMany({ where, orderBy, skip, take }),
      prisma.marca.count({ where }),
    ]);
    res.json({ data: marcas, pagination: buildPaginationMeta({ page, pageSize, total }) });
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const marca = await prisma.marca.findFirst({
      where: { id: req.params.id, deleted: false },
    });
    if (!marca) throw new ApiError(404, 'Marca não encontrada.', 'NOT_FOUND');
    res.json(marca);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { nome, percentual_comissao } = req.body;
    if (!nome || percentual_comissao == null) {
      throw new ApiError(400, 'Os campos nome e percentual_comissao são obrigatórios.', 'VALIDATION_ERROR');
    }
    const marca = await prisma.marca.create({ data: { nome, percentual_comissao, ativo: true } });
    res.status(201).json(marca);
  } catch (err) {
    next(err);
  }
};

// Espelha CadastrarMarcaScreen.js#handleSalvar: ao mudar a comissão, recalcula
// o custo de TODOS os produtos da marca (custo = preco_venda × (1 - comissao/100)).
const atualizar = async (req, res, next) => {
  try {
    const { nome, percentual_comissao } = req.body;

    const marca = await prisma.$transaction(async (tx) => {
      const marcaAtual = await tx.marca.findFirst({ where: { id: req.params.id, deleted: false } });
      if (!marcaAtual) throw new ApiError(404, 'Marca não encontrada.', 'NOT_FOUND');

      const comissaoMudou = percentual_comissao != null && Number(percentual_comissao) !== marcaAtual.percentual_comissao.toNumber();

      const atualizada = await tx.marca.update({
        where: { id: req.params.id },
        data: { nome, percentual_comissao },
      });

      if (comissaoMudou) {
        const produtos = await tx.produto.findMany({ where: { marca_id: req.params.id, deleted: false } });
        for (const produto of produtos) {
          const novoCusto = produto.preco_venda.toNumber() * (1 - Number(percentual_comissao) / 100);
          await tx.produto.update({ where: { id: produto.id }, data: { custo_preco: novoCusto } });
        }
      }

      return atualizada;
    });

    res.json(marca);
  } catch (err) {
    next(err);
  }
};

// Espelha GerenciarMarcasScreen.js#handleExcluir: sem produtos → exclui direto;
// com produtos mas sem vendas → exclui a marca e desvincula os produtos
// (marca_id = null); com produtos vendidos → inativa marca + produtos em vez
// de excluir (preserva histórico).
const remover = async (req, res, next) => {
  try {
    const marca = await prisma.marca.findFirst({ where: { id: req.params.id, deleted: false } });
    if (!marca) throw new ApiError(404, 'Marca não encontrada.', 'NOT_FOUND');

    const produtos = await prisma.produto.findMany({ where: { marca_id: req.params.id, deleted: false } });

    if (produtos.length === 0) {
      await prisma.marca.update({ where: { id: req.params.id }, data: { deleted: true } });
      return res.status(204).send();
    }

    const produtoIds = produtos.map((p) => p.id);
    const qtdVendas = await prisma.vendaItem.count({ where: { produto_id: { in: produtoIds }, deleted: false } });

    if (qtdVendas === 0) {
      await prisma.$transaction([
        prisma.produto.updateMany({ where: { marca_id: req.params.id }, data: { marca_id: null } }),
        prisma.marca.update({ where: { id: req.params.id }, data: { deleted: true } }),
      ]);
      return res.status(204).send();
    }

    await prisma.$transaction([
      prisma.produto.updateMany({ where: { marca_id: req.params.id }, data: { ativo: false } }),
      prisma.marca.update({ where: { id: req.params.id }, data: { ativo: false } }),
    ]);
    res.json({ inativada: true, mensagem: 'Possui histórico de vendas — foi inativada e seus produtos foram ocultados.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, remover };
