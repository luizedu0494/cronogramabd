import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView, RefreshControl } from 'react-native';
import { supabase } from '../supabase';
import { UserCheck, Clock, MapPin, CheckCircle2, XCircle, Plus, FileText } from 'lucide-react-native';
import { useAuth } from '../AuthContext';

export function DesignacoesScreen() {
  const { userProfile } = useAuth();
  const [designacoes, setDesignacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados do Modal "Propor Aula"
  const [modalPropostaVisible, setModalPropostaVisible] = useState(false);
  const [disciplina, setDisciplina] = useState('');
  const [laboratorio, setLaboratorio] = useState('');
  const [dataAula, setDataAula] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviandoProposta, setEnviandoProposta] = useState(false);

  const carregarDesignacoes = async () => {
    setCarregando(true);
    try {
      let query = supabase.from('aulas').select('*').order('data', { ascending: false }).limit(30);

      // Se for técnico, filtrar por suas designações ou aulas públicas
      if (userProfile?.cargo === 'tecnico' && userProfile?.uid) {
        query = query.or(`tecnico_uid.eq.${userProfile.uid},tecnicos_designados.cs.{${userProfile.uid}}`);
      }

      const { data, error } = await query;
      if (!error && data) {
        setDesignacoes(data);
      }
    } catch (e) {
      console.error('Erro ao carregar designações:', e);
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarDesignacoes();

    const channel = supabase
      .channel('realtime:designacoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aulas' }, () => {
        carregarDesignacoes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile]);

  const responderDesignacao = async (id, acao) => {
    try {
      const statusFinal = acao === 'aceitar' ? 'confirmado' : 'recusado';
      const { error } = await supabase.from('aulas').update({ status_tecnico: statusFinal }).eq('id', id);

      if (error) throw error;
      Alert.alert('Sucesso', `Designação ${statusFinal} com sucesso!`);
      carregarDesignacoes();
    } catch (e) {
      console.error('Erro ao responder designação:', e);
      Alert.alert('Erro', 'Não foi possível atualizar a designação.');
    }
  };

  const handleSubmeterProposta = async () => {
    if (!disciplina || !laboratorio || !dataAula || !horarioInicio || !horarioFim) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setEnviandoProposta(true);
    try {
      const novaAula = {
        disciplina,
        laboratorio,
        data: dataAula,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
        observacoes,
        professor: userProfile?.nome || 'Professor Proponente',
        solicitante_uid: userProfile?.uid,
        status_aprovacao: 'pendente',
        criada_em: new Date().toISOString(),
      };

      const { data: aulaInserida, error } = await supabase.from('aulas').insert([novaAula]).select().single();
      if (error) throw error;

      // Inserir notificação para os coordenadores (desencadeará o push nativo/web)
      const { data: coords } = await supabase.from('users').select('uid').eq('cargo', 'coordenador');
      if (coords && coords.length > 0) {
        const notificacoes = coords.map((c) => ({
          destinatario_uid: c.uid,
          tipo: 'aprovacao_proposta',
          titulo: `Nova Proposta: ${disciplina}`,
          corpo: `Proposta de aula enviada por ${userProfile?.nome || 'Professor'} para ${dataAula}.`,
          aula_id: aulaInserida.id,
        }));
        await supabase.from('notificacoes').insert(notificacoes);
      }

      Alert.alert('Sucesso 🎉', 'Proposta de aula enviada com sucesso! Aguardando aprovação da coordenação.');
      setModalPropostaVisible(false);
      // Limpar formulário
      setDisciplina('');
      setLaboratorio('');
      setDataAula('');
      setHorarioInicio('');
      setHorarioFim('');
      setObservacoes('');
      carregarDesignacoes();
    } catch (err) {
      console.error('Erro ao enviar proposta:', err);
      Alert.alert('Erro', 'Ocorreu uma falha ao enviar a proposta de aula.');
    } finally {
      setEnviandoProposta(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Designações & Propostas 📋</Text>
        <TouchableOpacity style={styles.btnPropor} onPress={() => setModalPropostaVisible(true)}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.btnProporTexto}>Propor Aula</Text>
        </TouchableOpacity>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#1E7EC8" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={designacoes}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={carregarDesignacoes} colors={['#1E7EC8']} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.disciplinaText}>{item.disciplina || item.assunto || 'Designação de Laboratório'}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status_aprovacao === 'pendente'
                      ? styles.badgePendente
                      : item.status_aprovacao === 'rejeitada'
                      ? styles.badgeRejeitada
                      : styles.badgeAprovada,
                  ]}
                >
                  <Text style={styles.statusText}>{item.status_aprovacao || 'confirmada'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Clock size={14} color="#64748B" />
                <Text style={styles.infoText}>
                  {item.data} • {item.horario_inicio}h às {item.horario_fim}h
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MapPin size={14} color="#64748B" />
                <Text style={styles.infoText}>{item.laboratorio || item.laboratorio_nome || 'Laboratório Cesmac'}</Text>
              </View>

              {userProfile?.cargo === 'tecnico' && (
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
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <UserCheck size={36} color="#94A3B8" />
              <Text style={styles.emptyText}>Nenhuma designação ou proposta pendente encontrada.</Text>
            </View>
          }
        />
      )}

      {/* Modal Fullscreen: Propor Aula */}
      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={modalPropostaVisible}
        onRequestClose={() => setModalPropostaVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Propor Nova Aula 🧪</Text>
            <TouchableOpacity onPress={() => setModalPropostaVisible(false)}>
              <Text style={styles.btnClose}>Fechar ✖</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Disciplina / Assunto *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Anatomia Humana Prática"
            value={disciplina}
            onChangeText={setDisciplina}
          />

          <Text style={styles.label}>Laboratório *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Lab de Histologia / Lab 02"
            value={laboratorio}
            onChangeText={setLaboratorio}
          />

          <Text style={styles.label}>Data (AAAA-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-09-15"
            value={dataAula}
            onChangeText={setDataAula}
          />

          <View style={styles.rowInputs}>
            <View style={styles.colInput}>
              <Text style={styles.label}>Início (HH:MM) *</Text>
              <TextInput
                style={styles.input}
                placeholder="08:00"
                value={horarioInicio}
                onChangeText={setHorarioInicio}
              />
            </View>
            <View style={styles.colInput}>
              <Text style={styles.label}>Fim (HH:MM) *</Text>
              <TextInput
                style={styles.input}
                placeholder="10:00"
                value={horarioFim}
                onChangeText={setHorarioFim}
              />
            </View>
          </View>

          <Text style={styles.label}>Observações / Insumos Necessários</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descreva reagentes, equipamentos ou lâminas necessárias..."
            multiline
            numberOfLines={4}
            value={observacoes}
            onChangeText={setObservacoes}
          />

          <TouchableOpacity
            style={[styles.btnSubmit, enviandoProposta && styles.btnDisabled]}
            onPress={handleSubmeterProposta}
            disabled={enviandoProposta}
          >
            {enviandoProposta ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnSubmitText}>Enviar Proposta para Aprovação</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
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
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
  },
  btnPropor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E7EC8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnProporTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeAprovada: {
    backgroundColor: '#DCFCE7',
  },
  badgePendente: {
    backgroundColor: '#FFEDD5',
  },
  badgeRejeitada: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#1E293B',
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
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  /* Modal Styles */
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  btnClose: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  colInput: {
    flex: 1,
  },
  btnSubmit: {
    backgroundColor: '#1E7EC8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  btnSubmitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
