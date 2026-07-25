// =============================================================================
// Nenem Cosméticos — Seed inicial
//
// Execução:
//   npx prisma db seed
//   (ou) node prisma/seed.js
//
// O que cria:
//   - Usuário admin padrão (admin / 1234, senha com hash bcrypt) se ainda
//     não existir
//   - Formas de pagamento padrão se a tabela estiver vazia
// =============================================================================

require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// 1. Cria a conexão usando o driver oficial
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// 2. Inicia o Prisma usando o adaptador
const prisma = new PrismaClient({ adapter });

async function seedUsuarios() {
  const existente = await prisma.usuario.findFirst({ where: { nome: 'admin' } });
  if (existente) {
    console.log('  ✓ Usuário admin já existe — pulando.');
    return;
  }
  const senhaHash = await bcrypt.hash('1234', 10);
  await prisma.usuario.create({
    data: { nome: 'admin', senha: senhaHash, ativo: true },
  });
  console.log('  ✓ Usuário admin criado (admin / 1234).');
}

async function seedFormasPagamento() {
  const count = await prisma.formaPagamento.count();
  if (count > 0) {
    console.log(`  ✓ Formas de pagamento já existem (${count}) — pulando.`);
    return;
  }
  const formas = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX'];
  for (const descricao of formas) {
    await prisma.formaPagamento.create({ data: { descricao } });
  }
  console.log(`  ✓ ${formas.length} formas de pagamento criadas.`);
}

async function main() {
  console.log('\n🌱 Executando seed do banco de dados...\n');
  await seedUsuarios();
  await seedFormasPagamento();
  console.log('\n✅ Seed concluído.\n');
}

main()
  .catch(err => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
