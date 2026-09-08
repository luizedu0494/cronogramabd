// src/services/aulaService.js
import { supabase } from '../supabaseConfig';

export const aulaService = {
  /**
   * Buscar todas as aulas com suporte a relacional (cursos e técnicos)
   */
  async getAulas(filtros = {}) {
    let query = supabase
      .from('aulas')
      .select(`
        *,
        aula_cursos(curso),
        aula_tecnicos(tecnico_uid, users:tecnico_uid(name, email))
      `)
      .order('data_inicio', { ascending: true });

    if (filtros.status) {
      query = query.eq('status', filtros.status);
    }

    if (filtros.laboratorio && filtros.laboratorio !== 'Todos') {
      query = query.eq('laboratorio', filtros.laboratorio);
    }

    if (filtros.buscaAssunto) {
      // Full-text search nativa no PostgreSQL ou ILIKE para fallback
      query = query.ilike('assunto', `%${filtros.buscaAssunto}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar aulas:', error);
      throw error;
    }

    // Normalizar formato dos cursos e técnicos para manter compatibilidade com o frontend
    return (data || []).map(aula => ({
      ...aula,
      cursos: aula.aula_cursos?.map(c => c.curso) || [],
      tecnicos: aula.aula_tecnicos?.map(t => t.tecnico_uid) || [],
      tecnicosInfo: aula.aula_tecnicos?.map(t => ({ uid: t.tecnico_uid, name: t.users?.name })) || [],
    }));
  },

  /**
   * Propor uma nova aula
   */
  async proporAula(dadosAula, cursosArray = [], tecnicosUids = []) {
    const { data: novaAula, error } = await supabase
      .from('aulas')
      .insert([{
        assunto: dadosAula.assunto,
        tipo_atividade: dadosAula.tipoAtividade || 'aula',
        laboratorio: dadosAula.laboratorioSelecionado || dadosAula.laboratorio,
        horario_slot: dadosAula.horarioSlotString || '',
        data_inicio: dadosAula.dataInicio,
        data_fim: dadosAula.dataFim,
        status: 'pendente',
        proposto_por_uid: dadosAula.propostoPorUid,
        proposto_por_nome: dadosAula.propostoPorNome,
        is_revisao: dadosAula.isRevisao || false,
        tipo_revisao_label: dadosAula.tipoRevisaoLabel || null,
        liga: dadosAula.liga || null,
        observacoes: dadosAula.observacoes || null,
        origem: dadosAula.origem || 'manual'
      }])
      .select()
      .single();

    if (error) throw error;

    // Vincular Cursos N:N
    if (cursosArray.length > 0) {
      await supabase.from('aula_cursos').insert(
        cursosArray.map(curso => ({ aula_id: novaAula.id, curso }))
      );
    }

    // Vincular Técnicos N:N
    if (tecnicosUids.length > 0) {
      await supabase.from('aula_tecnicos').insert(
        tecnicosUids.map(tecnico_uid => ({ aula_id: novaAula.id, tecnico_uid }))
      );
    }

    return novaAula;
  },

  /**
   * Atualizar status da aula (Aprovar / Rejeitar)
   */
  async atualizarStatus(aulaId, status) {
    const { data, error } = await supabase
      .from('aulas')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', aulaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
