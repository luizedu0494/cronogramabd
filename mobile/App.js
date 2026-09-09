import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [statusPush, setStatusPush] = useState<string>('Registrando push...');

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        setStatusPush('Push Ativo ✅');
        salvarTokenNoSupabase(token);
      } else {
        setStatusPush('Dispositivo sem suporte a Push ou no Emulador');
      }
    });

    carregarNotificacoes();

    // Escutar novas notificações em tempo real pelo Supabase Realtime
    const subscription = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', table: 'notificacoes', schema: 'public' }, (payload) => {
        setNotificacoes(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const salvarTokenNoSupabase = async (token: string) => {
    try {
      await supabase.from('push_subscriptions').upsert({
        user_uid: 'mobile_device',
        token: token,
        dispositivo: Device.modelName || 'Mobile',
        criado_em: new Date().toISOString()
      }, { onConflict: 'token' });
    } catch (e) {
      console.log('Erro ao salvar token:', e);
    }
  };

  const carregarNotificacoes = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .order('criada_em', { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotificacoes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const marcarLida = async (id: string) => {
    try {
      await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E7EC8" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CronoLab Mobile 📱</Text>
        <Text style={styles.headerSubtitle}>{statusPush}</Text>
      </View>

      {/* Lista de Notificações */}
      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notificações Recentes</Text>
          <TouchableOpacity onPress={carregarNotificacoes}>
            <Text style={styles.refreshBtn}>Atualizar 🔄</Text>
          </TouchableOpacity>
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color="#1E7EC8" style={{ marginTop: 40 }} />
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
              <Text style={styles.emptyText}>Nenhuma notificação encontrada.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Aviso', 'Permissão para notificações push não concedida!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
  } else {
    console.log('Push nativo requer dispositivo físico ou EAS Build.');
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#1E7EC8',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  refreshBtn: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
    fontSize: 14,
  },
});
