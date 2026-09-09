import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LayoutDashboard, Calendar, Bell, UserCheck, User } from 'lucide-react-native';

import { AuthProvider, useAuth } from './AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { CalendarioScreen } from './screens/CalendarioScreen';
import { NotificacoesScreen } from './screens/NotificacoesScreen';
import { DesignacoesScreen } from './screens/DesignacoesScreen';
import { PerfilScreen } from './screens/PerfilScreen';

const Tab = createBottomTabNavigator();

function AppNavigation() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E7EC8' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // Se não estiver logado, exibe a tela de Login/Cadastro/Visitante
  if (!user) {
    return <LoginScreen />;
  }

  const role = userProfile?.role || user?.role || 'visualizador';
  const isVisitante = role === 'visualizador';
  const isTecnico = role === 'tecnico';
  const isCoordenador = role === 'coordenador';

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1E7EC8',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        tabBarActiveTintColor: '#1E7EC8',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* Abas exclusivas por perfil */}
      {!isVisitante && (
        <Tab.Screen 
          name="Painel" 
          component={DashboardScreen} 
          options={{
            title: 'CronoLab CESMAC',
            tabBarLabel: 'Painel',
            tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          }}
        />
      )}

      <Tab.Screen 
        name="Calendario" 
        component={CalendarioScreen} 
        options={{
          title: 'Agenda de Laboratórios',
          tabBarLabel: 'Calendário',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />

      {!isVisitante && (
        <Tab.Screen 
          name="Notificacoes" 
          component={NotificacoesScreen} 
          options={{
            title: 'Central de Avisos',
            tabBarLabel: 'Avisos',
            tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
          }}
        />
      )}

      {isTecnico && (
        <Tab.Screen 
          name="Designacoes" 
          component={DesignacoesScreen} 
          options={{
            title: 'Minhas Designações',
            tabBarLabel: 'Designações',
            tabBarIcon: ({ color, size }) => <UserCheck size={size} color={color} />,
          }}
        />
      )}

      <Tab.Screen 
        name="Perfil" 
        component={PerfilScreen} 
        options={{
          title: 'Meu Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigation />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
