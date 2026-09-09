import React, { useState } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { User, Bell, LogOut, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useAuth } from '../AuthContext';
import { registrarTokenPushNativo } from '../services/pushService';

export function PerfilScreen() {
  const { userProfile, user, logout } = useAuth();
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);
  const [registrandoPush, setRegistrandoPush] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Confirmar Saída',
      'Deseja realmente encerrar a sua sessão no CronoLab?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleTogglePush = async (val) => {
    setNotificacoesAtivas(val);
    if (val && (userProfile?.uid || user?.id)) {
      setRegistrandoPush(true);
      const token = await registrarTokenPushNativo(userProfile?.uid || user?.id);
      setRegistrandoPush(false);
      if (token) {
        Alert.alert('Notificações Ativas 🎉', 'Seu dispositivo foi registrado com sucesso para receber alertas push!');
      } else {
        Alert.alert('Aviso', 'Não foi possível registrar o token neste dispositivo.');
      }
    }
  };

  const cargoFormatado = userProfile?.cargo
    ? userProfile.cargo.charAt(0).toUpperCase() + userProfile.cargo.slice(1)
    : userProfile?.role || 'Visualizador';

  return (
    <View style={styles.container}>
      {/* Card do Perfil Conectado */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <User size={36} color="#1E7EC8" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userProfile?.nome || userProfile?.name || user?.email || 'Usuário CronoLab'}</Text>
          <Text style={styles.userEmail}>{userProfile?.email || user?.email}</Text>
          <View style={styles.roleChip}>
            <ShieldCheck size={12} color="#166534" />
            <Text style={styles.roleText}>{cargoFormatado}</Text>
          </View>
        </View>
      </View>

      {/* Opções de Configuração */}
      <Text style={styles.sectionTitle}>Preferências & Dispositivos</Text>

      <View style={styles.optionRow}>
        <View style={styles.optionInfo}>
          <Bell size={20} color="#64748B" />
          <View>
            <Text style={styles.optionLabel}>Notificações Push Nativas</Text>
            <Text style={styles.optionSubLabel}>Receba alertas de aulas e novos comunicados</Text>
          </View>
        </View>
        {registrandoPush ? (
          <ActivityIndicator size="small" color="#1E7EC8" />
        ) : (
          <Switch
            value={notificacoesAtivas}
            onValueChange={handleTogglePush}
            trackColor={{ false: '#CBD5E1', true: '#1E7EC8' }}
          />
        )}
      </View>

      <View style={styles.optionRow}>
        <View style={styles.optionInfo}>
          <Smartphone size={20} color="#64748B" />
          <View>
            <Text style={styles.optionLabel}>Status do Dispositivo</Text>
            <Text style={styles.optionSubLabel}>Vinculado ao Expo Push Notification</Text>
          </View>
        </View>
        <View style={styles.statusDot} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Encerrar Sessão</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  optionRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  optionSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 30,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
