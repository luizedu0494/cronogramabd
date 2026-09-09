import { supabase } from '../supabaseConfig';

export interface Grupo {
  id: string;
  nome: string;
  descricao?: string;
  cor: string;
  labs_associados: string[];
  criado_por_uid: string;
  criado_em?: string;
  membros_count?: number;
  membros_uids?: string[];
}

export class GrupoService {
  async listarGrupos(): Promise<Grupo[]> {
    try {
      const { data, error } = await supabase
        .from('grupos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        return [];
      }

      return (data || []).map(g => ({
        id: g.id,
        nome: g.nome,
        descricao: g.descricao,
        cor: g.cor || '#1E7EC8',
        labs_associados: g.labs_associados || [],
        criado_por_uid: g.criado_por_uid,
        criado_em: g.criado_em,
        membros_count: (g.membros_uids || g.grupo_membros || []).length,
        membros_uids: g.membros_uids || (g.grupo_membros?.map((m: any) => m.user_uid || m.usuario_id) || []),
      }));
    } catch (err) {
      return [];
    }
  }

  async criarGrupo(dados: {
    nome: string;
    descricao?: string;
    cor?: string;
    labs_associados?: string[];
    criado_por_uid: string;
    membros_uids: string[];
  }): Promise<Grupo | null> {
    try {
      const { data: novoGrupo, error: errGrupo } = await supabase
        .from('grupos')
        .insert({
          nome: dados.nome,
          descricao: dados.descricao,
          cor: dados.cor || '#1E7EC8',
          labs_associados: dados.labs_associados || [],
          criado_por_uid: dados.criado_por_uid,
        })
        .select()
        .single();

      if (errGrupo || !novoGrupo) {
        console.error('Erro ao criar grupo:', errGrupo);
        throw errGrupo;
      }

      if (dados.membros_uids && dados.membros_uids.length > 0) {
        const registrosMembros = dados.membros_uids.map(uid => ({
          grupo_id: novoGrupo.id,
          user_uid: uid,
        }));
        const { error: errMembros } = await supabase
          .from('grupo_membros')
          .insert(registrosMembros);

        if (errMembros) console.error('Erro ao vincular membros ao grupo:', errMembros);
      }

      return {
        ...novoGrupo,
        membros_count: dados.membros_uids.length,
        membros_uids: dados.membros_uids,
      };
    } catch (err) {
      console.error('Erro no grupoService.criarGrupo:', err);
      return null;
    }
  }

  async atualizarGrupo(
    grupoId: string,
    dados: {
      nome?: string;
      descricao?: string;
      cor?: string;
      labs_associados?: string[];
      membros_uids?: string[];
    }
  ): Promise<boolean> {
    try {
      const updatePayload: any = {};
      if (dados.nome !== undefined) updatePayload.nome = dados.nome;
      if (dados.descricao !== undefined) updatePayload.descricao = dados.descricao;
      if (dados.cor !== undefined) updatePayload.cor = dados.cor;
      if (dados.labs_associados !== undefined) updatePayload.labs_associados = dados.labs_associados;

      if (Object.keys(updatePayload).length > 0) {
        const { error } = await supabase
          .from('grupos')
          .update(updatePayload)
          .eq('id', grupoId);
        if (error) throw error;
      }

      if (dados.membros_uids !== undefined) {
        // Remover membros antigos
        await supabase.from('grupo_membros').delete().eq('grupo_id', grupoId);

        // Inserir novos membros
        if (dados.membros_uids.length > 0) {
          const registrosMembros = dados.membros_uids.map(uid => ({
            grupo_id: grupoId,
            user_uid: uid,
          }));
          await supabase.from('grupo_membros').insert(registrosMembros);
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao atualizar grupo:', err);
      return false;
    }
  }

  async deletarGrupo(grupoId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('grupos').delete().eq('id', grupoId);
      return !error;
    } catch (err) {
      console.error('Erro ao apagar grupo:', err);
      return false;
    }
  }
}

export const grupoService = new GrupoService();
export default grupoService;
