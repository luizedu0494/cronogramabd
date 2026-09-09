import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../supabase';
import { Clock, MapPin, User } from 'lucide-react-native';

export function CalendarioScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [aulasDia, setAulasDia] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarDatasComAulas();
  }, []);

  useEffect(() => {
    carregarAulasDoDia(selectedDate);
  }, [selectedDate]);

  const carregarDatasComAulas = async () => {
    try {
      const { data } = await supabase.from('aulas').select('data');
      if (data) {
        const marks = {};
        data.forEach(item => {
          if (item.data) {
            marks[item.data] = { marked: true, dotColor: '#1E7EC8' };
          }
        });
        setMarkedDates(prev => ({
          ...marks,
          [selectedDate]: { ...(marks[selectedDate] || {}), selected: true, selectedColor: '#1E7EC8' }
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const carregarAulasDoDia = async (dataAlvo) => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('aulas')
        .select('*')
        .eq('data', dataAlvo)
        .order('horario_inicio', { ascending: true });

      if (!error && data) {
        setAulasDia(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setMarkedDates(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key]?.selected) {
          delete updated[key].selected;
          delete updated[key].selectedColor;
        }
      });
      updated[day.dateString] = {
        ...(updated[day.dateString] || {}),
        selected: true,
        selectedColor: '#1E7EC8'
      };
      return updated;
    });
  };

  return (
    <View style={styles.container}>
      {/* Componente Nativo de Calendário */}
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
        }}
        style={styles.calendar}
      />

      {/* Lista de Aulas do Dia Selecionado */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Aulas em {selectedDate.split('-').reverse().join('/')}</Text>

        {carregando ? (
          <ActivityIndicator size="large" color="#1E7EC8" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={aulasDia}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.aulaCard}>
                <Text style={styles.disciplinaText}>{item.disciplina || 'Aula Prática'}</Text>
                
                <View style={styles.infoRow}>
                  <Clock size={14} color="#64748B" />
                  <Text style={styles.infoText}>{item.horario_inicio}h - {item.horario_fim}h</Text>
                </View>

                <View style={styles.infoRow}>
                  <MapPin size={14} color="#64748B" />
                  <Text style={styles.infoText}>{item.laboratorio_nome || 'Laboratório de Saúde'}</Text>
                </View>
              </View>
            )}
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
  calendar: {
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  aulaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#00C853',
  },
  disciplinaText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 20,
    fontSize: 14,
  },
});
