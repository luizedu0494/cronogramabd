import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LayoutDashboard, Calendar, Bell, UserCheck, User } from 'lucide-react-native';

import { DashboardScreen } from './screens/DashboardScreen';
import { CalendarioScreen } from './screens/CalendarioScreen';
import { NotificacoesScreen } from './screens/NotificacoesScreen';
import { DesignacoesScreen } from './screens/DesignacoesScreen';
import { PerfilScreen } from './screens/PerfilScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
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
          <Tab.Screen 
            name="Painel" 
            component={DashboardScreen} 
            options={{
              title: 'CronoLab CESMAC',
              tabBarLabel: 'Painel',
              tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
            }}
          />

          <Tab.Screen 
            name="Calendario" 
            component={CalendarioScreen} 
            options={{
              title: 'Agenda de Laboratórios',
              tabBarLabel: 'Calendário',
              tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
            }}
          />

          <Tab.Screen 
            name="Notificacoes" 
            component={NotificacoesScreen} 
            options={{
              title: 'Avisos e Notificações',
              tabBarLabel: 'Avisos',
              tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
            }}
          />

          <Tab.Screen 
            name="Designacoes" 
            component={DesignacoesScreen} 
            options={{
              title: 'Minhas Designações',
              tabBarLabel: 'Designações',
              tabBarIcon: ({ color, size }) => <UserCheck size={size} color={color} />,
            }}
          />

          <Tab.Screen 
            name="Perfil" 
            component={PerfilScreen} 
            options={{
              title: 'Perfil e Preferências',
              tabBarLabel: 'Perfil',
              tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
