import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseConfig';
import { notificationService } from '../services/notificationService';
import { Notificacao } from '../types';

export function useNotificacoes(userUid?: string) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const carregarNotificacoes = useCallback(async () => {
    if (!userUid) return;
    try {
      setLoading(true);
      const data = await notificationService.getNotificacoes(userUid);
      setNotificacoes(data);
    } catch (err) {
      console.error('Erro ao carregar notificações no hook:', err);
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  useEffect(() => {
    if (!userUid) return;

    carregarNotificacoes();

    // Inscrição em tempo real no Supabase Realtime
    const channel = supabase
      .channel(`notificacoes:${userUid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `destinatario_uid=eq.${userUid}`,
        },
        (payload) => {
          const novaNotificacao = payload.new as Notificacao;
          setNotificacoes((prev) => [novaNotificacao, ...prev]);
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
          const notifAtualizada = payload.new as Notificacao;
          setNotificacoes((prev) =>
            prev.map((item) => (item.id === notifAtualizada.id ? notifAtualizada : item))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userUid, carregarNotificacoes]);

  const marcarLida = async (id: string) => {
    try {
      await notificationService.marcarComoLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true, lida_em: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  const marcarTodasLidas = async () => {
    if (!userUid) return;
    try {
      await notificationService.marcarTodasComoLidas(userUid);
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true, lida_em: new Date().toISOString() })));
    } catch (err) {
      console.error('Erro ao marcar todas notificações como lidas:', err);
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
