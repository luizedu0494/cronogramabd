import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseConfig';

export interface NotificacaoItem {
  id: string;
  destinatario_uid: string;
  tipo: string;
  titulo: string;
  corpo: string;
  lida: boolean;
  aula_id?: string;
  evento_id?: string;
  aviso_id?: string;
  criada_em: string;
  lida_em?: string;
}

export function useNotificacoes(uid?: string) {
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  const carregarNotificacoes = useCallback(async () => {
    if (!uid) {
      setNotificacoes([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('destinatario_uid', uid)
        .order('criada_em', { ascending: false })
        .limit(50);

      if (!error && data) {
        setNotificacoes(data);
      } else if (error) {
        // Tratar 404 (Tabela não existe ainda) graciosamente sem estourar exceção
        setNotificacoes([]);
      }
    } catch (err) {
      setNotificacoes([]);
    } finally {
      setCarregando(false);
    }
  }, [uid]);

  useEffect(() => {
    carregarNotificacoes();

    if (!uid) return;

    const channelName = `notificacoes_${uid}`;
    
    // Remover qualquer canal residual antes de instanciar novo
    const existingChannel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `destinatario_uid=eq.${uid}`,
        },
        payload => {
          const novaNotificacao = payload.new as NotificacaoItem;
          setNotificacoes(prev => [novaNotificacao, ...prev]);

          // Disparar Notificação Local de Desktop (funciona 100% sem servidores Push externos e imune a AdBlock)
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(novaNotificacao.titulo || 'Nova Notificação - CronoLab', {
                body: novaNotificacao.corpo || '',
                icon: '/icons/icon-192x192.png',
                tag: novaNotificacao.id,
              });
            } catch (e) {
              console.warn('Erro ao disparar notificação local:', e);
            }
          }
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, carregarNotificacoes]);

  const marcarLida = async (id: string) => {
    try {
      await supabase
        .from('notificacoes')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('id', id);

      setNotificacoes(prev => prev.map(n => (n.id === id ? { ...n, lida: true } : n)));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  const marcarTodasLidas = async () => {
    if (!uid) return;
    try {
      await supabase
        .from('notificacoes')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('destinatario_uid', uid)
        .eq('lida', false);

      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (err) {
      console.error('Erro ao marcar todas notificações como lidas:', err);
    }
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return {
    notificacoes,
    naoLidas,
    carregando,
    marcarLida,
    marcarTodasLidas,
    recarregar: carregarNotificacoes,
  };
}
