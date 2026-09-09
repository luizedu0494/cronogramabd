import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { supabase } from '../supabase';
import { Calendar, AlertCircle, Clock, MapPin, User } from 'lucide-react-native';
import { useAuth } from '../AuthContext';

export function DashboardScreen() {
  const { userProfile } = useAuth();
  const [aulasHoje, setAulasHoje] = useState([]);
  const [propostasPendentes, setPropostasPendentes] = useState(0);
  const [estatisticas, setEstatisticas] = useState({ totalAulasMes: 0, laboratoriosAtivos: 0 });
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarDadosDashboard = async () => {
    setCarregando(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // 1. Buscar todas as aulas do Supabase para mapeamento híbrido
      const { data: todasAulas, error } = await supabase
        .from('aulas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && todasAulas) {
        // Filtrar aulas de hoje (suportando 'data' ou 'data_inicio')
        const hojeAulas = todasAulas.filter((a) => {
          const d1 = a.data;
          const d2 = a.data_inicio ? a.data_inicio.split('T')[0] : null;
          return d1 === hoje || d2 === hoje;
        });

        setAulasHoje(hojeAulas);

        // Filtrar pendentes (suportando 'status' ou 'status_aprovacao')
        const pendentes = todasAulas.filter(
          (a) => a.status === 'pendente' || a.status_aprovacao === 'pendente'
        );
        setPropostasPendentes(pendentes.length);

        setEstatisticas({
          totalAulasMes: todasAulas.length,
          laboratoriosAtivos: 12,
        });
      }
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e);
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarDadosDashboard();

    const channel = supabase
      .channel('realtime:dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aulas' }, () => {
        carregarDadosDashboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={carregarDadosDashboard} colors={['#1E7EC8']} />}
    >
      {/* Banner de Boas-Vindas Personalizado */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>
          Olá, {userProfile?.nome || userProfile?.name ? (userProfile.nome || userProfile.name).split(' ')[0] : 'Bem-vindo'} 👋
        </Text>
        <Text style={styles.welcomeSubtitle}>
          CronoLab CESMAC — Painel de Controle de Laboratórios
        </Text>
        {(userProfile?.cargo || userProfile?.role) && (
          <View style={styles.cargoBadge}>
            <Text style={styles.cargoText}>{(userProfile.cargo || userProfile.role).toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Cards de Métricas Reais */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{aulasHoje.length}</Text>
          <Text style={styles.metricLabel}>Aulas Hoje</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricNumber, propostasPendentes > 0 && { color: '#EA580C' }]}>
            {propostasPendentes}
          </Text>
          <Text style={styles.metricLabel}>Pendentes</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{estatisticas.totalAulasMes}</Text>
          <Text style={styles.metricLabel}>Total Aulas</Text>
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
        aulasHoje.map((aula) => {
          const statusStr = aula.status || aula.status_aprovacao || 'confirmada';
          const horarioStr = aula.horario_slot || (aula.horario_inicio ? `${aula.horario_inicio}h - ${aula.horario_fim}h` : 'Horário a definir');
          const professorStr = aula.proposto_por_nome || aula.professor || aula.docente_nome;

          return (
            <View key={aula.id} style={styles.aulaCard}>
              <View style={styles.aulaHeader}>
                <Text style={styles.disciplinaText}>{aula.assunto || aula.disciplina || 'Atividade Prática'}</Text>
                <View style={[styles.badgeStatus, statusStr === 'pendente' && styles.badgePendente]}>
                  <Text style={[styles.badgeStatusText, statusStr === 'pendente' && styles.badgePendenteText]}>
                    {statusStr}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Clock size={14} color="#64748B" />
                <Text style={styles.infoText}>{horarioStr}</Text>
              </View>

              <View style={styles.infoRow}>
                <MapPin size={14} color="#64748B" />
                <Text style={styles.infoText}>{aula.laboratorio || aula.laboratorio_nome || 'Laboratório de Saúde'}</Text>
              </View>

              {professorStr && (
                <View style={styles.infoRow}>
                  <User size={14} color="#64748B" />
                  <Text style={styles.infoText}>Prof. {professorStr}</Text>
                </View>
              )}
            </View>
          );
        })
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
  cargoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 10,
  },
  cargoText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E7EC8',
  },
  metricLabel: {
    fontSize: 11,
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
    fontSize: 17,
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
    fontSize: 15,
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
    textTransform: 'uppercase',
  },
  badgePendente: {
    backgroundColor: '#FFEDD5',
  },
  badgePendenteText: {
    color: '#9A3412',
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
