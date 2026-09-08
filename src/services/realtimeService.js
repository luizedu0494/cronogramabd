// src/services/realtimeService.js
import { supabase } from '../supabaseConfig';

export const realtimeService = {
  /**
   * Inscrever-se para escutar mudanças na tabela de aulas em tempo real
   * (Substitui o onSnapshot do Firestore)
   */
  subscribeToAulas(callback) {
    const channel = supabase
      .channel('public:aulas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aulas' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Inscrever-se para escutar novos avisos
   */
  subscribeToAvisos(callback) {
    const channel = supabase
      .channel('public:avisos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'avisos' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
