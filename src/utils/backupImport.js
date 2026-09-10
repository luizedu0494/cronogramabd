import { supabase } from '../supabaseConfig';

function normalizar(str) {
  return (str || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Converte registro do formato Firebase (camelCase) para o formato Supabase (snake_case)
 */
// Mapeamento de chaves conhecidas do Firebase (camelCase) para Supabase (snake_case)
const MAPA_CAMPOS_FIREBASE_PARA_SUPABASE = {
  aulas: {
    laboratorioSelecionado: 'laboratorio',
    dataInicio: 'data_inicio',
    dataFim: 'data_fim',
    tipoAtividade: 'tipo_atividade',
    isRevisao: 'is_revisao',
    isProva: 'is_prova',
    horarioSlotString: 'horario_slot',
    proponenteNome: 'proposto_por_nome',
    usuarioNome: 'proposto_por_nome',
    propostoPorUid: 'proposto_por_uid',
    tipoRevisaoLabel: 'tipo_revisao_label',
  },
  eventos_manutencao: {
    laboratorioSelecionado: 'laboratorio',
    dataInicio: 'data_inicio',
    dataFim: 'data_fim',
    criadoPorUid: 'criado_por_uid',
    criadoPorNome: 'criado_por_nome',
  },
  periodos_sem_atividade: {
    dataInicio: 'data_inicio',
    dataFim: 'data_fim',
    motivo: 'descricao',
  },
};

// Colunas válidas permitidas em cada tabela do Supabase
const COLUNAS_VALIDAS_SUPABASE = {
  aulas: [
    'id', 'assunto', 'tipo_atividade', 'laboratorio', 'horario_slot',
    'data_inicio', 'data_fim', 'status', 'cursos', 'proposto_por_uid',
    'proposto_por_nome', 'tecnicos', 'is_revisao', 'tipo_revisao_label',
    'is_prova', 'observacoes', 'origem', 'created_at', 'updated_at'
  ],
  eventos_manutencao: [
    'id', 'titulo', 'descricao', 'tipo', 'laboratorio', 'laboratorios',
    'data_inicio', 'data_fim', 'horario_slot', 'status', 'criado_por_uid',
    'criado_por_nome', 'created_at', 'updated_at'
  ],
  periodos_sem_atividade: [
    'id', 'descricao', 'data_inicio', 'data_fim', 'created_at'
  ],
  grupos: [
    'id', 'nome', 'descricao', 'created_at'
  ],
  avisos: [
    'id', 'titulo', 'mensagem', 'tipo', 'criado_por_uid', 'criado_por_nome', 'created_at'
  ],
};

function normalizarNomeTabela(nomeOriginal) {
  const dePara = {
    eventosmanutencao: 'eventos_manutencao',
    eventos_manutencao: 'eventos_manutencao',
    periodossematividade: 'periodos_sem_atividade',
    periodos_sem_atividade: 'periodos_sem_atividade',
    aulas: 'aulas',
    grupos: 'grupos',
    avisos: 'avisos',
  };
  const chave = (nomeOriginal || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return dePara[chave] || nomeOriginal;
}

/**
 * Converte registro do formato Firebase (camelCase) para o formato Supabase (snake_case)
 * e remove quaisquer atributos legados não suportados pelo schema Postgres.
 */
export function converterFirebaseParaSupabase(tabelaTarget, item) {
  if (!item) return item;

  const itemConvertido = {};
  const mapa = MAPA_CAMPOS_FIREBASE_PARA_SUPABASE[tabelaTarget] || {};
  const colunasPermitidas = new Set(COLUNAS_VALIDAS_SUPABASE[tabelaTarget] || []);

  // 1. Mapeia campos e renomeia
  for (const [chave, valor] of Object.entries(item)) {
    const chaveDestino = mapa[chave] || chave;
    itemConvertido[chaveDestino] = valor;
  }

  // 2. Ajustes específicos por entidade
  if (tabelaTarget === 'aulas') {
    itemConvertido.laboratorio = itemConvertido.laboratorio || item.laboratorioSelecionado || '';
    itemConvertido.data_inicio = itemConvertido.data_inicio || item.dataInicio || null;
    itemConvertido.data_fim = itemConvertido.data_fim || item.dataFim || null;
    itemConvertido.tipo_atividade = itemConvertido.tipo_atividade || item.tipoAtividade || 'aula';
    itemConvertido.is_revisao = itemConvertido.is_revisao !== undefined ? itemConvertido.is_revisao : (item.isRevisao || false);
    itemConvertido.is_prova = itemConvertido.is_prova !== undefined ? itemConvertido.is_prova : (item.isProva || item.tipoAtividade === 'prova');
    itemConvertido.horario_slot = itemConvertido.horario_slot || item.horarioSlotString || '';
    itemConvertido.cursos = itemConvertido.cursos || (item.curso ? [item.curso] : []);
    itemConvertido.proposto_por_nome = itemConvertido.proposto_por_nome || item.proponenteNome || item.usuarioNome || '';
    itemConvertido.assunto = itemConvertido.assunto || item.titulo || '';
  }

  // 3. Converte Timestamp Firestore ({seconds, nanoseconds}) ou número para ISO String se necessário
  for (const campoData of ['data_inicio', 'data_fim', 'created_at', 'updated_at']) {
    if (itemConvertido[campoData]) {
      const val = itemConvertido[campoData];
      if (typeof val === 'object' && val.seconds !== undefined) {
        itemConvertido[campoData] = new Date(val.seconds * 1000).toISOString();
      } else if (typeof val === 'number') {
        itemConvertido[campoData] = new Date(val).toISOString();
      }
    }
  }

  // 4. Filtra estritamente apenas colunas existentes no schema do Supabase (descarta createdAt, updatedAt, etc)
  const itemSanitizado = {};
  for (const [chave, valor] of Object.entries(itemConvertido)) {
    if (colunasPermitidas.has(chave) && valor !== undefined && valor !== null) {
      itemSanitizado[chave] = valor;
    }
  }

  // Mantém _id ou id para referência de deduplicação
  if (item._id) itemSanitizado._id = item._id;

  return itemSanitizado;
}

export function chaveNatural(tabelaTarget, item) {
  const itemNormalizado = converterFirebaseParaSupabase(tabelaTarget, item);

  switch (tabelaTarget) {
    case 'aulas':
      return `${normalizar(itemNormalizado.laboratorio)}|${itemNormalizado.data_inicio}|${normalizar(itemNormalizado.assunto)}`;
    case 'eventos_manutencao':
      return `${normalizar(itemNormalizado.laboratorio)}|${itemNormalizado.data_inicio}|${itemNormalizado.data_fim}|${normalizar(itemNormalizado.titulo)}`;
    case 'periodos_sem_atividade':
      return `${itemNormalizado.data_inicio}|${itemNormalizado.data_fim}|${normalizar(itemNormalizado.descricao)}`;
    case 'grupos':
      return normalizar(itemNormalizado.nome);
    case 'avisos':
      return `${normalizar(itemNormalizado.titulo)}|${(itemNormalizado.created_at || '').slice(0, 16)}`;
    default:
      return itemNormalizado._id || itemNormalizado.id;
  }
}

export async function analisarBackupParaImportacao(backupJson) {
  if (!backupJson || !backupJson.colecoes) {
    throw new Error('Arquivo de backup inválido ou estrutura corrompida.');
  }

  const relatorio = {};
  const isFirebaseOrigin = backupJson.meta?.backendOrigem === 'firebase' || !backupJson.meta?.backendOrigem;

  for (const [nomeColecaoOriginal, itens] of Object.entries(backupJson.colecoes)) {
    if (!Array.isArray(itens)) continue;

    const tabelaTarget = normalizarNomeTabela(nomeColecaoOriginal);
    if (!COLUNAS_VALIDAS_SUPABASE[tabelaTarget]) {
      console.warn(`Coleção/tabela não reconhecida ignorada: ${nomeColecaoOriginal}`);
      continue;
    }

    // Busca registros já existentes na tabela Postgres
    const { data: existentes, error } = await supabase.from(tabelaTarget).select('*');
    if (error) {
      console.warn(`Aviso ao ler tabela ${tabelaTarget}: ${error.message}`);
    }

    const chavesExistentes = new Set((existentes || []).map(e => chaveNatural(tabelaTarget, e)));

    const novos = [];
    const jaExistem = [];

    for (const item of itens) {
      const itemSanitizado = converterFirebaseParaSupabase(tabelaTarget, item);
      const chave = chaveNatural(tabelaTarget, itemSanitizado);

      if (chavesExistentes.has(chave)) {
        jaExistem.push(itemSanitizado);
      } else {
        novos.push(itemSanitizado);
      }
    }

    relatorio[tabelaTarget] = {
      novos,
      jaExistem,
      totalNoBackup: itens.length,
    };
  }

  return relatorio;
}

export async function importarSomenteNovos(relatorio, userProfile) {
  for (const [tabela, data] of Object.entries(relatorio)) {
    const novos = data.novos || [];
    if (novos.length === 0) continue;

    const colunasPermitidas = new Set(COLUNAS_VALIDAS_SUPABASE[tabela] || []);

    const linhas = novos.map(({ _id, id, _membros, ...resto }) => {
      const linhaSanitizada = {
        ...resto,
        origem: resto.origem || 'backup_importado',
      };

      // Garante que NENHUMA propriedade extra fora do schema do Supabase seja enviada no payload do insert
      const linhaFinal = {};
      for (const [key, val] of Object.entries(linhaSanitizada)) {
        if (colunasPermitidas.has(key) && key !== 'id') {
          linhaFinal[key] = val;
        }
      }
      return linhaFinal;
    });

    // Insere em lotes de 200 registros (para evitar limites de payload e header HTTP)
    for (let i = 0; i < linhas.length; i += 200) {
      const loteBruto = linhas.slice(i, i + 200);

      // Coleta a união de todas as chaves presentes em pelo menos 1 registro do lote
      const chavesDoLote = new Set();
      loteBruto.forEach((obj) => {
        Object.keys(obj).forEach((k) => chavesDoLote.add(k));
      });

      // Padroniza todos os objetos do lote para terem exatamente o mesmo conjunto de chaves (usando null se ausente)
      const loteHomogeneo = loteBruto.map((obj) => {
        const itemPadrao = {};
        chavesDoLote.forEach((k) => {
          itemPadrao[k] = obj[k] !== undefined ? obj[k] : null;
        });
        return itemPadrao;
      });

      const { error } = await supabase.from(tabela).insert(loteHomogeneo);
      if (error) {
        throw new Error(`Falha ao importar registros em ${tabela}: ${error.message}`);
      }
    }
  }


  // Registra auditoria na tabela 'logs' se ela existir
  try {
    await supabase.from('logs').insert({
      type: 'importacao_backup',
      payload: {
        por: userProfile?.name || userProfile?.nome || 'Coordenador',
        resumo: Object.fromEntries(
          Object.entries(relatorio).map(([t, r]) => [t, { novos: r.novos.length, ignorados: r.jaExistem.length }])
        ),
      },
    });
  } catch (err) {
    console.warn('Não foi possível gravar log de auditoria da importação:', err);
  }
}
