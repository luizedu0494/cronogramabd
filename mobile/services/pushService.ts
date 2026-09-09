import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

// Verificar se está rodando dentro do aplicativo "Expo Go"
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Importar dinamicamente expo-notifications apenas se NÃO for Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications!.AndroidNotificationPriority.HIGH,
        }),
      });
    }
  } catch (e) {
    console.warn('Expo Notifications desativado no ambiente atual.');
  }
}

/**
 * Solicita permissões e registra o token do Expo Push no Supabase para o usuário logado
 */
export async function registrarTokenPushNativo(userUid: string): Promise<string | null> {
  // A partir do SDK 53, o Expo Go não suporta mais push nativo remoto no Android sem uma Development Build.
  if (isExpoGo || !Notifications || !Device) {
    console.warn(
      'Push notifications remotos requerem uma Development Build (eas build) a partir do Expo SDK 53 no Expo Go.'
    );
    return null;
  }

  if (!Device.isDevice) {
    console.log('Push nativo indisponível em emuladores/simuladores.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permissão de notificação negada pelo usuário.');
      return null;
    }

    // Criar canais de notificação no Android (exigido no Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('cronolab-designacoes', {
        name: 'Designações e Propostas',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E7EC8',
      });
      await Notifications.setNotificationChannelAsync('cronolab-avisos', {
        name: 'Avisos e Comunicados',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
      await Notifications.setNotificationChannelAsync('cronolab-aulas', {
        name: 'Aulas e Laboratórios',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    const expoToken = tokenData.data;

    // Salva ou atualiza o token na tabela push_tokens_mobile no Supabase
    await supabase.from('push_tokens_mobile').upsert(
      {
        user_uid: userUid,
        expo_token: expoToken,
        platform: Platform.OS,
        device_name: Device.deviceName || 'Dispositivo Móvel',
        ativo: true,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'expo_token' }
    );

    return expoToken;
  } catch (err) {
    console.error('Erro ao obter/registrar Expo Push Token:', err);
    return null;
  }
}

/**
 * Escuta cliques nas notificações para redirecionamento nativo
 */
export function configurarListenerNotificacoes(navigation: any) {
  if (isExpoGo || !Notifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (!data) return;

    switch (data.tipo) {
      case 'aula_adicionada':
      case 'aula_editada':
      case 'aula_excluida':
        navigation.navigate('Calendario', { aulaId: data.aulaId });
        break;
      case 'aviso_urgente':
      case 'aviso_normal':
      case 'aviso_importante':
        navigation.navigate('Notificacoes');
        break;
      default:
        navigation.navigate('Dashboard');
    }
  });

  return () => subscription.remove();
}
