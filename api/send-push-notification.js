import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@cronolab.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization;
  const secretKey = req.headers['x-app-secret-key'];

  // Validação por secret key ou Bearer token
  if (
    secretKey !== process.env.MY_APP_SECRET_KEY &&
    authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`
  ) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const { destinatario_uid, uids, payload, title, body, data } = req.body;

  const targetUids = uids || (destinatario_uid ? [destinatario_uid] : []);

  if (targetUids.length === 0) {
    return res.status(400).json({ error: 'É necessário informar uids ou destinatario_uid.' });
  }

  const pushPayload = payload || {
    title: title || 'CronoLab',
    body: body || '',
    data: data || {},
  };

  try {
    const { data: subscricoes, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_uid')
      .in('user_uid', targetUids)
      .eq('ativo', true);

    let sucessos = 0;
    let falhas = 0;

    // 1. Enviar notificações Web Push VAPID
    const { data: subscricoes } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_uid')
      .in('user_uid', targetUids)
      .eq('ativo', true);

    if (subscricoes && subscricoes.length > 0) {
      const resultadosWeb = await Promise.allSettled(
        subscricoes.map(sub =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(pushPayload)
          )
        )
      );

      for (let i = 0; i < resultadosWeb.length; i++) {
        if (resultadosWeb[i].status === 'fulfilled') {
          sucessos++;
        } else {
          falhas++;
          const status = resultadosWeb[i].reason?.statusCode;
          if (status === 404 || status === 410) {
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscricoes[i].endpoint);
          }
        }
      }
    }

    // 2. Enviar notificações Push Nativo Mobile (Expo/Capacitor)
    const { data: mobileTokens } = await supabaseAdmin
      .from('push_tokens_mobile')
      .select('expo_token, user_uid')
      .in('user_uid', targetUids)
      .eq('ativo', true);

    if (mobileTokens && mobileTokens.length > 0) {
      const expoMessages = mobileTokens.map(m => ({
        to: m.expo_token,
        sound: 'default',
        title: pushPayload.title,
        body: pushPayload.body,
        data: pushPayload.data || {},
        priority: 'high',
      }));

      try {
        const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expoMessages),
        });

        if (expoRes.ok) {
          sucessos += mobileTokens.length;
        } else {
          falhas += mobileTokens.length;
        }
      } catch (expoErr) {
        console.error('Erro no despacho Expo Push Mobile:', expoErr);
        falhas += mobileTokens.length;
      }
    }

    return res.status(200).json({ sucessos, falhas });
  } catch (err) {
    console.error('Erro no despacho de Push Notification:', err);
    return res.status(500).json({ error: err.message || 'Erro interno.' });
  }
}
