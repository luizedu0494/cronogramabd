import React, { useState } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert } from 'react-native';
import { User, Bell, Moon, LogOut, Shield } from 'lucide-react-native';
import { useAuth } from '../AuthContext';

export function PerfilScreen() {
  const { userProfile, user, logout } = useAuth();
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Confirmar Saída',
      'Deseja realmente encerrar a sua sessão no CronoLab?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout }
      ]
    );
  };

  const roleName = userProfile?.role === 'coordenador' 
    ? 'Coordenador de Laboratórios' 
    : userProfile?.role === 'tecnico' 
    ? 'Técnico de Laboratório' 
    : 'Visitante (Visualizador)';

  return (
    <View style={styles.container}>
      {/* Card do Perfil Conectado */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <User size={36} color="#1E7EC8" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userProfile?.name || user?.name || 'Usuário CronoLab'}</Text>
          <Text style={styles.userEmail}>{userProfile?.email || user?.email}</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleText}>{roleName}</Text>
          </View>
        </View>
      </View>

      {/* Opções de Configuração */}
      <Text style={styles.sectionTitle}>Preferências do App</Text>

      <View style={styles.optionRow}>
        <View style={styles.optionInfo}>
          <Bell size={20} color="#64748B" />
          <Text style={styles.optionLabel}>Notificações Push</Text>
        </View>
        <Switch 
          value={notificacoesAtivas} 
          onValueChange={setNotificacoesAtivas}
          trackColor={{ false: '#CBD5E1', true: '#1E7EC8' }}
        />
      </View>

      <View style={styles.optionRow}>
        <View style={styles.optionInfo}>
          <Moon size={20} color="#64748B" />
          <Text style={styles.optionLabel}>Modo Escuro (Dark Theme)</Text>
        </View>
        <Switch 
          value={darkMode} 
          onValueChange={setDarkMode}
          trackColor={{ false: '#CBD5E1', true: '#1E7EC8' }}
        />
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
    justify.content: 'center',
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
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
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
  },
  optionLabel: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
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
