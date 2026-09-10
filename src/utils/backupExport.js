import { supabase } from '../supabaseConfig';
import { saveAs } from 'file-saver';

const TABELAS_BACKUP = ['aulas', 'eventos_manutencao', 'periodos_sem_atividade', 'grupos', 'avisos'];

export async function gerarBackupCompleto(userProfile) {
  const colecoes = {};

  for (const tabela of TABELAS_BACKUP) {
    const { data, error } = await supabase.from(tabela).select('*');
    if (error) throw new Error(`Falha ao exportar ${tabela}: ${error.message}`);

    colecoes[tabela] = (data || []).map(({ id, ...resto }) => ({ _id: id, ...resto }));
  }

  // grupo_membros é filho de grupos — anexa por grupo_id
  const { data: membros, error: errorMembros } = await supabase.from('grupo_membros').select('*');
  if (!errorMembros && membros) {
    colecoes.grupos = (colecoes.grupos || []).map(g => ({
      ...g,
      _membros: membros
        .filter(m => m.grupo_id === g._id)
        .map(({ id, ...r }) => ({ _id: id, ...r })),
    }));
  }

  const backup = {
    meta: {
      app: 'CronoLab',
      backendOrigem: 'supabase',
      versaoFormato: '1.0',
      geradoEm: new Date().toISOString(),
      geradoPor: { uid: userProfile?.uid || userProfile?.id, nome: userProfile?.name || userProfile?.nome },
      instituicao: 'CESMAC',
    },
    colecoes,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const dataStr = new Date().toISOString().slice(0, 10);
  saveAs(blob, `cronolab-backup-supabase-${dataStr}.json`);

  return backup;
}
