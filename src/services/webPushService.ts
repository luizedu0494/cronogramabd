import { supabase } from '../supabaseConfig';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export async function registrarWebPush(uid: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Web Push não suportado neste navegador.');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY não está configurada.');
      return false;
    }

    const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await registro.update();

    const permissao = await Notification.requestPermission();
    if (permissao !== 'granted') {
      console.warn('Permissão de notificação negada pelo usuário.');
      return false;
    }

    const subscricao = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const keyP256dh = subscricao.getKey('p256dh');
    const keyAuth = subscricao.getKey('auth');

    if (!keyP256dh || !keyAuth) {
      throw new Error('Chaves da subscrição Push inválidas');
    }

    const p256dhStr = window.btoa(String.fromCharCode(...new Uint8Array(keyP256dh)));
    const authStr = window.btoa(String.fromCharCode(...new Uint8Array(keyAuth)));

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_uid: uid,
        endpoint: subscricao.endpoint,
        p256dh: p256dhStr,
        auth: authStr,
        user_agent: navigator.userAgent,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('Erro ao salvar subscrição no Supabase:', error);
      return false;
    }

    // Atualizar preferências para indicar que webpush está ativo
    await supabase
      .from('notificacao_preferencias')
      .upsert({ user_uid: uid, webpush_ativo: true }, { onConflict: 'user_uid' });

    return true;
  } catch (err) {
    console.error('Erro ao registrar Web Push:', err);
    return false;
  }
}

export async function revogarWebPush(uid: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;

    const registro = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await registro?.pushManager.getSubscription();

    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }

    await supabase
      .from('notificacao_preferencias')
      .update({ webpush_ativo: false })
      .eq('user_uid', uid);

    return true;
  } catch (err) {
    console.error('Erro ao revogar Web Push:', err);
    return false;
  }
}

export async function obterStatusPush(): Promise<NotificationPermission | 'unsupported'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}
