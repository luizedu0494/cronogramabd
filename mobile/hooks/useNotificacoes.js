import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export function useNotificacoesMobile(userUid) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregarNotificacoes = useCallback(async () => {
    if (!userUid) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('destinatario_uid', userUid)
        .order('criada_em', { ascending: false });

      if (!error && data) {
        setNotificacoes(data);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  useEffect(() => {
    if (!userUid) return;

    carregarNotificacoes();

    const channel = supabase
      .channel(`notificacoes_mobile:${userUid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `destinatario_uid=eq.${userUid}`,
        },
        (payload) => {
          setNotificacoes((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notificacoes',
          filter: `destinatario_uid=eq.${userUid}`,
        },
        (payload) => {
          setNotificacoes((prev) =>
            prev.map((item) => (item.id === payload.new.id ? payload.new : item))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userUid, carregarNotificacoes]);

  const marcarLida = async (id) => {
    try {
      await supabase
        .from('notificacoes')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('id', id);

      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  const marcarTodasLidas = async () => {
    if (!userUid) return;
    try {
      await supabase
        .from('notificacoes')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('destinatario_uid', userUid)
        .eq('lida', false);

      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const naoLidasCount = notificacoes.filter((n) => !n.lida).length;

  return {
    notificacoes,
    loading,
    naoLidasCount,
    marcarLida,
    marcarTodasLidas,
    refresh: carregarNotificacoes,
  };
}
