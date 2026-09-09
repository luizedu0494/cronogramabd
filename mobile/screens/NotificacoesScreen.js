import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../supabase';
import { Bell, CheckCircle, Clock } from 'lucide-react-native';

export function NotificacoesScreen() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregarNotificacoes = async () => {
    setCarregando(true);
    try {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .order('criada_em', { ascending: false })
        .limit(40);

      if (data) setNotificacoes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarNotificacoes();

    const subscription = supabase
      .channel('notificacoes-realtime')
      .on('postgres_changes', { event: 'INSERT', table: 'notificacoes', schema: 'public' }, (payload) => {
        setNotificacoes(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const marcarLida = async (id) => {
    try {
      await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Central de Avisos 🔔</Text>
        <TouchableOpacity onPress={carregarNotificacoes}>
          <Text style={styles.refreshText}>Atualizar 🔄</Text>
        </TouchableOpacity>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#1E7EC8" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.card, !item.lida && styles.cardNaoLida]} 
              onPress={() => marcarLida(item.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                {!item.lida && <View style={styles.badgeUnread} />}
              </View>
              <Text style={styles.cardCorpo}>{item.corpo}</Text>
              <Text style={styles.cardData}>
                {new Date(item.criada_em).toLocaleString('pt-BR')}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bell size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>Você não possui notificações pendentes.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  refreshText: {
    fontSize: 13,
    color: '#1E7EC8',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardNaoLida: {
    borderColor: '#1E7EC8',
    backgroundColor: '#F0F7FF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  badgeUnread: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  cardCorpo: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  cardData: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
});
