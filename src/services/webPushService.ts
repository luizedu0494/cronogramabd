import { supabase } from '../supabaseConfig';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registrarWebPush(userUid: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push não é suportado neste navegador.');
    return false;
  }

  const DEFAULT_VAPID_PUBLIC_KEY = 'BLjEhLkPJrJlWbtKRvyGR2fZhFQvm9SEj-zm0aulM55fDJVkjJsZMGwe95sAVs6IGyFyFA_t0fFfhfQNijH66I4';
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || import.meta.env.VITE_FIREBASE_VAPID_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permissão de notificação negada no navegador.');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys) return false;

    // Salvar inscrição de Web Push no Supabase
    await supabase.from('push_subscriptions').upsert(
      {
        user_uid: userUid,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        user_agent: navigator.userAgent,
        ativo: true,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    return true;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn('O serviço de Push do navegador não está ativo ou foi bloqueado pelo ambiente local.');
    } else {
      console.error('Erro ao registrar Web Push:', err);
    }
    return false;
  }
}

export async function revogarWebPush(userUid: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const subJson = subscription.toJSON();
      if (subJson.endpoint) {
        await supabase
          .from('push_subscriptions')
          .update({ ativo: false, atualizado_em: new Date().toISOString() })
          .eq('endpoint', subJson.endpoint);
      }
      await subscription.unsubscribe();
    }

    return true;
  } catch (err) {
    console.error('Erro ao revogar Web Push:', err);
    return false;
  }
}

