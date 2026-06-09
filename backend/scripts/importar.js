const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fs = require('fs');
const csv = require('csv-parser');
const prisma = require('../src/lib/prisma'); // Conexão com o banco

// 1. Função auxiliar para ler o CSV
function lerCSV(caminhoArquivo, opcoes = {}) {
    return new Promise((resolve, reject) => {
        const resultados = [];
        fs.createReadStream(caminhoArquivo)
            .pipe(csv(opcoes))
            .on('data', (data) => resultados.push(data))
            .on('end', () => resolve(resultados))
            .on('error', (erro) => reject(erro));
    });
}

// 2. Importação de Clientes
async function importarClientes() {
    console.log('--- Iniciando importação de clientes...');
    const arquivoClientes = path.join(__dirname, '../../ArquivosMigracao/clientes.csv');

    if (!fs.existsSync(arquivoClientes)) {
        console.log('⚠️ Arquivo clientes.csv não encontrado na raiz do projeto. Pulando...');
        return;
    }

    const clientes = await lerCSV(arquivoClientes, { separator: ';', headers: ['nome'] });
    let inseridos = 0;

    for (const row of clientes) {
        if (!row.nome) continue;
        await prisma.pessoa.create({
            data: {
                nome: row.nome.trim(),
                telefone: null,
                tipo: 'C',
            },
        });
        inseridos++;
    }
    console.log(`✅ ${inseridos} clientes importados com sucesso!`);
}

// 3. Importação Otimizada de Produtos
async function importarProdutos() {
    console.log('--- Iniciando importação de produtos...');
    const arquivoProdutos = path.join(__dirname, '../../ArquivosMigracao/produtos.csv');

    if (!fs.existsSync(arquivoProdutos)) {
        console.log('⚠️ Arquivo produtos.csv não encontrado na raiz do projeto. Pulando...');
        return;
    }

    const produtos = await lerCSV(arquivoProdutos, { separator: ';' });

    // CARREGAR CACHE DE MARCAS
    const marcasExistentes = await prisma.marca.findMany();
    const mapaMarcas = new Map(marcasExistentes.map(m => [m.nome.toLowerCase(), m.id]));

    const novosProdutos = [];

    for (const row of produtos) {
        if (!row.descricao) continue;

        let nomeMarca = (row.marca || 'Sem Marca').trim();
        let marcaId = mapaMarcas.get(nomeMarca.toLowerCase());

        // Criar marca nova se não existir
        if (!marcaId) {
            const novaMarca = await prisma.marca.create({
                data: { nome: nomeMarca, percentual_comissao: 0 }
            });
            marcaId = novaMarca.id;
            mapaMarcas.set(nomeMarca.toLowerCase(), marcaId);
        }

        novosProdutos.push({
            descricao: row.descricao.trim(),
            marca_id: marcaId,
            preco_venda: parseFloat((row.preco_venda || '0').replace(',', '.')),
            custo_preco: parseFloat((row.custo || '0').replace(',', '.')),
            cod_barras: row.cod_barras ? row.cod_barras.trim() : null,
            qtd_estoque: 0,
            tipo_baixa: 'I',
        });
    }

    // INSERÇÃO EM LOTE (Muito mais rápido)
    if (novosProdutos.length > 0) {
        await prisma.produto.createMany({
            data: novosProdutos,
            skipDuplicates: true,
        });
        console.log(`✅ ${novosProdutos.length} produtos importados com sucesso!`);
    } else {
        console.log('Nenhum produto válido encontrado no CSV para importar.');
    }
}

// 4. Execução Principal (Com rastreadores de erro)
async function executar() {
    console.log('=========================================');
    console.log('🚀 INICIANDO SCRIPT DE IMPORTAÇÃO');
    console.log('=========================================');

    try {
        console.log('⏳ Conectando ao banco de dados...');
        await prisma.$connect();
        console.log('🟢 Conexão com o banco estabelecida com sucesso!');

        await importarClientes();
        await importarProdutos();

        console.log('🎉 Importação totalmente finalizada!');
    } catch (error) {
        console.error('❌ ERRO CRÍTICO DURANTE A IMPORTAÇÃO:');
        console.error(error);
    } finally {
        console.log('🔌 Fechando conexão com o banco de dados...');
        await prisma.$disconnect();
        console.log('Script encerrado.');
    }
}

executar();