import { supabase } from '../supabaseConfig';

export interface UserLog {
  uid?: string;
  nome?: string;
  name?: string;
  displayName?: string;
  email?: string;
}

export interface AulaLogData {
  title?: string;
  assunto?: string;
  cursos?: string[];
  status?: string;
  start?: any;
  dataInicio?: any;
  laboratorio?: string;
  laboratorioSelecionado?: string;
  isRevisao?: boolean;
  tipoRevisaoLabel?: string | null;
}

export const registrarLogExclusao = async (
  itemData: AulaLogData,
  usuario: UserLog,
  colecaoOrigem: string = 'aulas'
) => {
  try {
    const assunto = itemData.title || itemData.assunto || 'Sem assunto';
    const cursosStr = itemData.cursos && itemData.cursos.length > 0 ? itemData.cursos.join(', ') : 'Geral';
    const acaoVerbo = colecaoOrigem === 'eventosManutencao' ? 'excluiu o evento de manutenção' : 'excluiu a aula';
    
    const descricao = `${usuario.nome || usuario.displayName || usuario.name || 'Usuário'} ${acaoVerbo} "${assunto}" (${cursosStr})`;

    await supabase.from('logs').insert([{
      type: 'DELETE',
      collection: colecaoOrigem,
      user_uid: usuario.uid || null,
      user_nome: usuario.nome || usuario.displayName || usuario.name || 'Anônimo',
      payload: {
        descricao,
        item: itemData
      },
      created_at: new Date().toISOString()
    }]);

    console.log(`[LOG] Log de exclusão registrado com sucesso para a coleção ${colecaoOrigem}.`);
  } catch (error) {
    console.error(`[LOG ERRO] Falha ao registrar log de exclusão:`, error);
  }
};

export interface EventoLogData {
  id?: string;
  titulo?: string;
  tipo?: string;
  laboratorio?: string;
  dataInicio?: any;
  dataFim?: any;
  horarioSlotString?: string;
  status?: string;
}

export const registrarLogEvento = async (
  acaoVerbo: string,
  tituloEvento: string,
  usuario: UserLog,
  detalhes: any = {}
) => {
  try {
    const nomeUsuario = usuario.nome || usuario.displayName || usuario.name || usuario.email || 'Usuário';
    const descricao = `${nomeUsuario} ${acaoVerbo} "${tituloEvento}"`;

    await supabase.from('logs').insert([{
      type: 'EVENT',
      collection: 'eventos_manutencao',
      user_uid: usuario.uid || null,
      user_nome: nomeUsuario,
      payload: {
        descricao,
        detalhes
      },
      created_at: new Date().toISOString()
    }]);

    console.log(`[LOG] Log de evento registrado com sucesso: "${descricao}"`);
  } catch (error) {
    console.error(`[LOG ERRO] Falha ao registrar log de evento:`, error);
  }
};

