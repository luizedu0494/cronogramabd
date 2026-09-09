import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../supabaseConfig';

export function usePushRegistration(uid?: string) {
  useEffect(() => {
    if (!uid) return;

    async function registerPush() {
      try {
        if (Platform.OS === 'web') {
          // Registrar Web Push / VAPID na Web
          if ('serviceWorker' in navigator && 'PushManager' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const registration = await navigator.serviceWorker.ready;
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.EXPO_PUBLIC_VAPID_KEY || process.env.VITE_FIREBASE_VAPID_KEY,
              });

              await supabase.from('push_subscriptions').upsert({
                user_id: uid,
                subscription: JSON.stringify(subscription),
                updated_at: new Date().toISOString(),
              });
            }
          }
        } else {
          // Registrar Expo Push Notifications no Nativo (iOS/Android)
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus === 'granted') {
            const tokenData = await Notifications.getExpoPushTokenAsync();
            const expoPushToken = tokenData.data;

            await supabase.from('push_tokens_mobile').upsert({
              user_id: uid,
              expo_push_token: expoPushToken,
              platform: Platform.OS,
              updated_at: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('Erro ao registrar Push Token:', error);
      }
    }

    registerPush();
  }, [uid]);
}
