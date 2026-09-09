import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { supabase } from '../supabase';
import { Calendar, AlertCircle, Clock, MapPin, User, ChevronRight } from 'lucide-react-native';

export function DashboardScreen() {
  const [aulasHoje, setAulasHoje] = useState([]);
  const [estatisticas, setEstatisticas] = useState({ totalAulas: 0, laboratoriosAtivos: 0 });
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarDadosDashboard = async () => {
    setCarregando(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Buscar aulas do dia
      const { data: aulas, error } = await supabase
        .from('aulas')
        .select('*')
        .eq('data', hoje)
        .order('horario_inicio', { ascending: true });

      if (!error && aulas) {
        setAulasHoje(aulas);
      }

      // Buscar estatísticas gerais
      const { data: labsData } = await supabase.from('laboratorios').select('id');
      const { count: totalAulasCount } = await supabase.from('aulas').select('*', { count: 'exact', head: true });

      setEstatisticas({
        totalAulas: totalAulasCount || 0,
        laboratoriosAtivos: labsData?.length || 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarDadosDashboard();
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={carregarDadosDashboard} colors={['#1E7EC8']} />}
    >
      {/* Banner de Boas-Vindas */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>CronoLab CESMAC 🧪</Text>
        <Text style={styles.welcomeSubtitle}>Painel de Controle e Agendamento da Saúde</Text>
      </View>

      {/* Cards de Métricas */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{aulasHoje.length}</Text>
          <Text style={styles.metricLabel}>Aulas Hoje</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{estatisticas.laboratoriosAtivos}</Text>
          <Text style={styles.metricLabel}>Laboratórios</Text>
        </View>
      </View>

      {/* Seção: Aulas de Hoje */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Agenda de Hoje</Text>
        <Text style={styles.sectionDate}>{new Date().toLocaleDateString('pt-BR')}</Text>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#1E7EC8" style={{ marginTop: 20 }} />
      ) : aulasHoje.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Calendar size={32} color="#94A3B8" />
          <Text style={styles.emptyText}>Nenhuma aula agendada para hoje.</Text>
        </View>
      ) : (
        aulasHoje.map((aula) => (
          <View key={aula.id} style={styles.aulaCard}>
            <View style={styles.aulaHeader}>
              <Text style={styles.disciplinaText}>{aula.disciplina || 'Atividade Prática'}</Text>
              <View style={styles.badgeStatus}>
                <Text style={styles.badgeStatusText}>{aula.status || 'Confirmada'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Clock size={14} color="#64748B" />
              <Text style={styles.infoText}>{aula.horario_inicio}h - {aula.horario_fim}h</Text>
            </View>

            <View style={styles.infoRow}>
              <MapPin size={14} color="#64748B" />
              <Text style={styles.infoText}>{aula.laboratorio_nome || 'Laboratório de Saúde'}</Text>
            </View>

            {aula.docente_nome && (
              <View style={styles.infoRow}>
                <User size={14} color="#64748B" />
                <Text style={styles.infoText}>Prof. {aula.docente_nome}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#1E7EC8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1E7EC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E7EC8',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sectionDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  aulaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#1E7EC8',
  },
  aulaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  disciplinaText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  badgeStatus: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },
});
