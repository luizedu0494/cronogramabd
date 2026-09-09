import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../supabase';
import { UserCheck, Clock, MapPin, CheckCircle2, XCircle } from 'lucide-react-native';

export function DesignacoesScreen() {
  const [designacoes, setDesignacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregarDesignacoes = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('aulas')
        .select('*')
        .not('tecnico_uid', 'is', null)
        .order('data', { ascending: false })
        .limit(30);

      if (!error && data) {
        setDesignacoes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDesignacoes();
  }, []);

  const responderDesignacao = async (id, acao) => {
    try {
      const statusFinal = acao === 'aceitar' ? 'confirmado' : 'recusado';
      await supabase.from('aulas').update({ status: statusFinal }).eq('id', id);
      Alert.alert('Sucesso', `Designação ${statusFinal} com sucesso!`);
      carregarDesignacoes();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minhas Designações Técnico 📋</Text>

      {carregando ? (
        <ActivityIndicator size="large" color="#1E7EC8" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={designacoes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.disciplinaText}>{item.disciplina || 'Designação de Laboratório'}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status || 'Pendente'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Clock size={14} color="#64748B" />
                <Text style={styles.infoText}>{item.data} • {item.horario_inicio}h às {item.horario_fim}h</Text>
              </View>

              <View style={styles.infoRow}>
                <MapPin size={14} color="#64748B" />
                <Text style={styles.infoText}>{item.laboratorio_nome || 'Laboratório Cesmac'}</Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnAceitar]} 
                  onPress={() => responderDesignacao(item.id, 'aceitar')}
                >
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={styles.btnText}>Aceitar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnRecusar]} 
                  onPress={() => responderDesignacao(item.id, 'recusar')}
                >
                  <XCircle size={16} color="#FFFFFF" />
                  <Text style={styles.btnText}>Recusar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <UserCheck size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>Você não possui designações registradas.</Text>
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
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
  statusBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
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
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  btnAceitar: {
    backgroundColor: '#00C853',
  },
  btnRecusar: {
    backgroundColor: '#EF4444',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
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
