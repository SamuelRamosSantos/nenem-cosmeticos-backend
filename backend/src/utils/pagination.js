const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

// Lê page/pageSize/sortBy/sortOrder da query string com defaults seguros.
// allowedSortBy é uma whitelist — evita orderBy em coluna arbitrária vinda do
// cliente (nome de coluna inválido derruba a query do Prisma com erro feio).
function parsePagination(query, { defaultSortBy, allowedSortBy = [defaultSortBy], defaultSortOrder = 'asc' }) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  const sortBy = allowedSortBy.includes(query.sortBy) ? query.sortBy : defaultSortBy;
  const sortOrder = query.sortOrder === 'desc' || query.sortOrder === 'asc' ? query.sortOrder : defaultSortOrder;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { [sortBy]: sortOrder },
  };
}

function buildPaginationMeta({ page, pageSize, total }) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

module.exports = { parsePagination, buildPaginationMeta };
