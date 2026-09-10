import { supabase } from '../supabaseConfig';

function normalizar(str) {
  return (str || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Converte registro do formato Firebase (camelCase) para o formato Supabase (snake_case)
 */
export function converterFirebaseParaSupabase(tabela, item) {
  if (!item) return item;

  // Se já possui snake_case ou foi gerado pelo Supabase, retorna como está
  if (tabela === 'aulas' && (item.laboratorio || item.data_inicio)) {
    return item;
  }

  switch (tabela) {
    case 'aulas':
      return {
        ...item,
        laboratorio: item.laboratorio || item.laboratorioSelecionado || '',
        data_inicio: item.data_inicio || item.dataInicio || null,
        data_fim: item.data_fim || item.dataFim || null,
        tipo_atividade: item.tipo_atividade || item.tipoAtividade || 'aula',
        is_revisao: item.is_revisao !== undefined ? item.isRevisao : false,
        is_prova: item.is_prova !== undefined ? item.isProva : (item.tipoAtividade === 'prova'),
        horario_slot: item.horario_slot || item.horarioSlotString || '',
        cursos: item.cursos || (item.curso ? [item.curso] : []),
        proposto_por_nome: item.proposto_por_nome || item.proponenteNome || item.usuarioNome || '',
        assunto: item.assunto || item.titulo || '',
      };
    case 'eventos_manutencao':
      return {
        ...item,
        laboratorio: item.laboratorio || item.laboratorioSelecionado || '',
        data_inicio: item.data_inicio || item.dataInicio || null,
        data_fim: item.data_fim || item.dataFim || null,
        titulo: item.titulo || item.nome || '',
        descricao: item.descricao || '',
      };
    case 'periodos_sem_atividade':
      return {
        ...item,
        data_inicio: item.data_inicio || item.dataInicio || null,
        data_fim: item.data_fim || item.dataFim || null,
        descricao: item.descricao || item.motivo || '',
      };
    default:
      return item;
  }
}

export function chaveNatural(tabela, item) {
  const itemNormalizado = converterFirebaseParaSupabase(tabela, item);

  switch (tabela) {
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
  const isFirebaseOrigin = backupJson.meta?.backendOrigem === 'firebase';

  for (const [tabela, itens] of Object.entries(backupJson.colecoes)) {
    if (!Array.isArray(itens)) continue;

    // Busca registros já existentes na tabela
    const { data: existentes, error } = await supabase.from(tabela).select('*');
    if (error) {
      console.warn(`Aviso ao ler tabela ${tabela}: ${error.message}`);
    }

    const chavesExistentes = new Set((existentes || []).map(e => chaveNatural(tabela, e)));

    const novos = [];
    const jaExistem = [];

    for (const item of itens) {
      const itemConvertido = isFirebaseOrigin ? converterFirebaseParaSupabase(tabela, item) : item;
      const chave = chaveNatural(tabela, itemConvertido);

      if (chavesExistentes.has(chave)) {
        jaExistem.push(itemConvertido);
      } else {
        novos.push(itemConvertido);
      }
    }

    relatorio[tabela] = {
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

    const linhas = novos.map(({ _id, id, _membros, ...resto }) => ({
      ...resto,
      origem: 'backup_importado',
    }));

    // Insere em lotes de 500 registros
    for (let i = 0; i < linhas.length; i += 500) {
      const lote = linhas.slice(i, i + 500);
      const { error } = await supabase.from(tabela).insert(lote);
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
