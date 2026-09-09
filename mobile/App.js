import { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const WEB_APP_URL = 'https://cronolab.vercel.app';

export default function App() {
  const [activeTab, setActiveTab] = useState('app'); // 'app' ou 'notificacoes'
  const [carregandoWeb, setCarregandoWeb] = useState(true);
  const webViewRef = useRef(null);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1E7EC8" />

      {/* Header Mobile Nativo */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CronoLab CESMAC 🧪</Text>
        
        {/* Alternador de Abas Navegação */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'app' && styles.tabButtonActive]}
            onPress={() => setActiveTab('app')}
          >
            <Text style={[styles.tabText, activeTab === 'app' && styles.tabTextActive]}>
              🌐 Sistema Completo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'notificacoes' && styles.tabButtonActive]}
            onPress={() => setActiveTab('notificacoes')}
          >
            <Text style={[styles.tabText, activeTab === 'notificacoes' && styles.tabTextActive]}>
              🔔 Central Avisos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo da Aba 1: Sistema Web Completo via Expo WebView */}
      {activeTab === 'app' && (
        <View style={{ flex: 1 }}>
          {carregandoWeb && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#1E7EC8" />
              <Text style={styles.loadingText}>Carregando CronoLab...</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: WEB_APP_URL }}
            onLoadEnd={() => setCarregandoWeb(false)}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
          />
        </View>
      )}

      {/* Conteúdo da Aba 2: Central Nativa de Notificações */}
      {activeTab === 'notificacoes' && <CentralNotificacoes />}
    </SafeAreaView>
  );
}

function CentralNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarNotificacoes();

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

  const carregarNotificacoes = async () => {
    setCarregando(true);
    try {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .order('criada_em', { ascending: false })
        .limit(30);

      if (data) setNotificacoes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  const marcarLida = async (id) => {
    try {
      await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.content}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Avisos e Designações</Text>
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
            <Text style={styles.emptyText}>Nenhuma notificação recebida.</Text>
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
  },
  header: {
    backgroundColor: '#1E7EC8',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  tabTextActive: {
    color: '#1E7EC8',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
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
