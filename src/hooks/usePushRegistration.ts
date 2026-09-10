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
              const DEFAULT_VAPID_PUBLIC_KEY = 'BLjEhLkPJrJlWbtKRvyGR2fZhFQvm9SEj-zm0aulM55fDJVkjJsZMGwe95sAVs6IGyFyFA_t0fFfhfQNijH66I4';
              const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || process.env.EXPO_PUBLIC_VAPID_KEY || DEFAULT_VAPID_PUBLIC_KEY;
              if (vapidKey) {
                const reg = await navigator.serviceWorker.ready;
                const subscription = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: vapidKey,
                });

                await supabase.from('push_subscriptions').upsert({
                  user_uid: uid,
                  endpoint: subscription.endpoint,
                  keys: subscription.toJSON().keys,
                  updated_at: new Date().toISOString(),
                });
              }
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
