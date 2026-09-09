import React from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Bell, CheckCheck } from 'lucide-react-native';
import { useAuth } from '../AuthContext';
import { useNotificacoesMobile as useNotificacoes } from '../hooks/useNotificacoes';

export function NotificacoesScreen() {
  const { user } = useAuth();
  const { notificacoes, loading, naoLidasCount, marcarLida, marcarTodasLidas, refresh } = useNotificacoes(user?.id);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Central de Alertas 🔔</Text>
          {naoLidasCount > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{naoLidasCount}</Text>
            </View>
          )}
        </View>
        {naoLidasCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={marcarTodasLidas}>
            <CheckCheck size={14} color="#1E7EC8" />
            <Text style={styles.markAllText}>Lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notificacoes}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#1E7EC8" />}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, !item.lida && styles.cardNaoLida]} 
            onPress={() => marcarLida(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, !item.lida && styles.cardTitleNaoLida]}>{item.titulo}</Text>
              {!item.lida && <View style={styles.badgeUnread} />}
            </View>
            <Text style={styles.cardCorpo}>{item.corpo}</Text>
            <Text style={styles.cardData}>
              {new Date(item.criada_em).toLocaleString('pt-BR')}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Bell size={36} color="#94A3B8" />
              <Text style={styles.emptyText}>Você não possui notificações no momento.</Text>
            </View>
          )
        }
      />
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  badgeCount: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
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
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  cardTitleNaoLida: {
    fontWeight: 'bold',
    color: '#0F172A',
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
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
