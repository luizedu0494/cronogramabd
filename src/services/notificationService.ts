import { supabase } from '../supabaseConfig';
import { Notificacao } from '../types';

export const notificationService = {
  /**
   * Buscar notificações do usuário ordenadas pela data mais recente
   */
  async getNotificacoes(userUid: string): Promise<Notificacao[]> {
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('destinatario_uid', userUid)
      .order('criada_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Marcar uma notificação específica como lida
   */
  async marcarComoLida(notificacaoId: string): Promise<void> {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('id', notificacaoId);

    if (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  },

  /**
   * Marcar todas as notificações do usuário como lidas
   */
  async marcarTodasComoLidas(userUid: string): Promise<void> {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('destinatario_uid', userUid)
      .eq('lida', false);

    if (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      throw error;
    }
  },

  /**
   * Inserir uma nova notificação in-app (acionará automaticamente o Webhook push)
   */
  async criarNotificacao(notificacao: Omit<Notificacao, 'id' | 'criada_em' | 'lida'>): Promise<Notificacao> {
    const { data, error } = await supabase
      .from('notificacoes')
      .insert([{ ...notificacao, lida: false, criada_em: new Date().toISOString() }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
    return data;
  }
};
