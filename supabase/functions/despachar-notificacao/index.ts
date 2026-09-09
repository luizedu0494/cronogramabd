import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import webpush from 'npm:web-push@3.6.7';

interface NotificationRecord {
  id: string;
  destinatario_uid: string;
  tipo: string;
  titulo: string;
  corpo: string;
  aula_id?: string;
  evento_id?: string;
  aviso_id?: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE';
  table: string;
  record: NotificationRecord;
}

serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();
    const notificacao = payload.record;

    if (!notificacao || !notificacao.destinatario_uid) {
      return new Response(JSON.stringify({ error: 'Payload de notificação inválido' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const uid = notificacao.destinatario_uid;

    // Buscar tokens do usuário em paralelo (Web VAPID e Mobile Expo)
    const [{ data: webSubs }, { data: mobileTokens }] = await Promise.all([
      supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_uid', uid).eq('ativo', true),
      supabase.from('push_tokens_mobile').select('expo_token').eq('user_uid', uid).eq('ativo', true),
    ]);

    const pushData = {
      tipo: notificacao.tipo,
      aulaId: notificacao.aula_id || null,
      eventoId: notificacao.evento_id || null,
      avisoId: notificacao.aviso_id || null,
    };

    const pushPayload = JSON.stringify({
      title: notificacao.titulo,
      body: notificacao.corpo,
      data: pushData,
    });

    const envios: Promise<any>[] = [];

    // 1. Web Push VAPID
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (vapidSubject && vapidPublicKey && vapidPrivateKey && webSubs && webSubs.length > 0) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      for (const sub of webSubs) {
        envios.push(
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload
          ).catch((err: any) => console.error('Erro ao enviar Web Push:', err))
        );
      }
    }

    // 2. Mobile Expo Push (iOS / Android)
    if (mobileTokens && mobileTokens.length > 0) {
      const messages = mobileTokens.map((t: { expo_token: string }) => ({
        to: t.expo_token,
        title: notificacao.titulo,
        body: notificacao.corpo,
        data: pushData,
        sound: 'default',
        badge: 1,
        channelId: mapearCanalAndroid(notificacao.tipo),
      }));

      envios.push(
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(messages),
        }).then(res => res.json()).catch((err: any) => console.error('Erro Expo Push:', err))
      );
    }

    await Promise.allSettled(envios);

    return new Response(JSON.stringify({ success: true, count: envios.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Erro na Edge Function despachar-notificacao:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

function mapearCanalAndroid(tipo: string): string {
  if (tipo.includes('designa') || tipo === 'aprovacao_proposta') return 'cronolab-designacoes';
  if (tipo.includes('aviso')) return 'cronolab-avisos';
  return 'cronolab-aulas';
}
