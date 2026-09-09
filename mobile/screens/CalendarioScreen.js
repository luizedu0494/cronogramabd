import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../supabase';
import { Clock, MapPin, User, FileText, LogOut } from 'lucide-react-native';
import { useAuth } from '../AuthContext';

export function CalendarioScreen() {
  const { userProfile, user, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [aulasDia, setAulasDia] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [carregando, setCarregando] = useState(false);

  const isVisitante = (userProfile?.role || user?.role) === 'visualizador' || user?.id === 'guest_user';

  const handleLogoutVisitante = () => {
    Alert.alert(
      'Sair da Fazer Login',
      'Deseja sair do modo Visitante e ir para a tela de login/cadastro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ir para Login', onPress: logout },
      ]
    );
  };

  useEffect(() => {
    carregarDatasComAulas();

    // Inscrever em atualizações Realtime das aulas
    const channel = supabase
      .channel('realtime:aulas_calendario')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aulas' },
        () => {
          carregarDatasComAulas();
          carregarAulasDoDia(selectedDate);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  useEffect(() => {
    carregarAulasDoDia(selectedDate);
  }, [selectedDate]);

  const carregarDatasComAulas = async () => {
    try {
      const { data } = await supabase.from('aulas').select('data, data_inicio');
      if (data) {
        const marks = {};
        data.forEach((item) => {
          const dataChave = item.data || (item.data_inicio ? item.data_inicio.split('T')[0] : null);
          if (dataChave) {
            marks[dataChave] = { marked: true, dotColor: '#1E7EC8' };
          }
        });
        setMarkedDates((prev) => ({
          ...marks,
          [selectedDate]: { ...(marks[selectedDate] || {}), selected: true, selectedColor: '#1E7EC8' },
        }));
      }
    } catch (e) {
      console.error('Erro ao carregar marcadores do calendário:', e);
    }
  };

  const carregarAulasDoDia = async (dataAlvo) => {
    setCarregando(true);
    try {
      // Buscar aulas considerando tanto o campo 'data' quanto 'data_inicio'
      const { data, error } = await supabase
        .from('aulas')
        .select('*')
        .or(`data.eq.${dataAlvo},data_inicio.gte.${dataAlvo}T00:00:00,data_inicio.lte.${dataAlvo}T23:59:59`);

      if (!error && data) {
        setAulasDia(data);
      } else {
        // Fallback: se a consulta OR falhar por tipagem, fazer a busca direta sem filtro estrito
        const { data: fallbackData } = await supabase.from('aulas').select('*').limit(50);
        if (fallbackData) {
          const filtradas = fallbackData.filter((a) => {
            const d1 = a.data;
            const d2 = a.data_inicio ? a.data_inicio.split('T')[0] : null;
            return d1 === dataAlvo || d2 === dataAlvo;
          });
          setAulasDia(filtradas);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar aulas do dia:', e);
    } finally {
      setCarregando(false);
    }
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setMarkedDates((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (updated[key]?.selected) {
          delete updated[key].selected;
          delete updated[key].selectedColor;
        }
      });
      updated[day.dateString] = {
        ...(updated[day.dateString] || {}),
        selected: true,
        selectedColor: '#1E7EC8',
      };
      return updated;
    });
  };

  return (
    <View style={styles.container}>
      {/* Banner de aviso para o visitante com botão de Login */}
      {isVisitante && (
        <View style={styles.bannerVisitante}>
          <View style={styles.bannerVisitanteTextos}>
            <Text style={styles.bannerVisitanteTitulo}>Modo Visitante 👁️</Text>
            <Text style={styles.bannerVisitanteSub}>Acessando visualização pública da agenda</Text>
          </View>
          <TouchableOpacity style={styles.btnBannerLogin} onPress={handleLogoutVisitante}>
            <LogOut size={14} color="#FFFFFF" />
            <Text style={styles.btnBannerLoginTexto}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      )}

      <Calendar
        current={selectedDate}
        onDayPress={onDayPress}
        markedDates={markedDates}
        theme={{
          todayTextColor: '#00C853',
          arrowColor: '#1E7EC8',
          textMonthFontWeight: 'bold',
          selectedDayBackgroundColor: '#1E7EC8',
          selectedDayTextColor: '#ffffff',
          calendarBackground: '#FFFFFF',
        }}
        style={styles.calendar}
      />

      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            Aulas em {selectedDate.split('-').reverse().join('/')}
          </Text>
          <Text style={styles.countBadge}>{aulasDia.length} aula(s)</Text>
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color="#1E7EC8" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={aulasDia}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const statusStr = item.status || item.status_aprovacao || 'aprovada';
              const horarioStr = item.horario_slot || (item.horario_inicio ? `${item.horario_inicio}h - ${item.horario_fim}h` : 'Horário a definir');
              const professorStr = item.proposto_por_nome || item.professor || item.docente_nome;

              return (
                <View style={styles.aulaCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.disciplinaText}>{item.assunto || item.disciplina || 'Aula Prática'}</Text>
                    <Text
                      style={[
                        styles.statusBadge,
                        statusStr === 'rejeitada'
                          ? styles.statusRejeitada
                          : statusStr === 'pendente'
                          ? styles.statusPendente
                          : styles.statusAprovada,
                      ]}
                    >
                      {statusStr}
                    </Text>
                  </View>

                  {professorStr && (
                    <View style={styles.infoRow}>
                      <User size={14} color="#64748B" />
                      <Text style={styles.infoText}>Prof. {professorStr}</Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Clock size={14} color="#64748B" />
                    <Text style={styles.infoText}>{horarioStr}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <MapPin size={14} color="#64748B" />
                    <Text style={styles.infoText}>
                      {item.laboratorio || item.laboratorio_nome || 'Laboratório de Saúde'}
                    </Text>
                  </View>

                  {item.observacoes && (
                    <View style={styles.infoRow}>
                      <FileText size={14} color="#64748B" />
                      <Text style={styles.obsText} numberOfLines={2}>
                        {item.observacoes}
                      </Text>
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Sem agendamentos para esta data.</Text>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bannerVisitante: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerVisitanteTextos: {
    flex: 1,
  },
  bannerVisitanteTitulo: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  bannerVisitanteSub: {
    color: '#94A3B8',
    fontSize: 11,
  },
  btnBannerLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E7EC8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnBannerLoginTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  calendar: {
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  countBadge: {
    fontSize: 12,
    color: '#1E7EC8',
    fontWeight: '600',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aulaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#1E7EC8',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  disciplinaText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusAprovada: {
    color: '#166534',
    backgroundColor: '#DCFCE7',
  },
  statusPendente: {
    color: '#9A3412',
    backgroundColor: '#FFEDD5',
  },
  statusRejeitada: {
    color: '#991B1B',
    backgroundColor: '#FEE2E2',
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
  obsText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 24,
    fontSize: 14,
  },
});
