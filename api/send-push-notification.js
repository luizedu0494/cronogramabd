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

    if (error || !subscricoes || subscricoes.length === 0) {
      return res.status(200).json({ message: 'Nenhuma subscrição Web Push encontrada para os usuários.' });
    }

    const resultados = await Promise.allSettled(
      subscricoes.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(pushPayload)
        )
      )
    );

    let sucessos = 0;
    let falhas = 0;

    for (let i = 0; i < resultados.length; i++) {
      if (resultados[i].status === 'fulfilled') {
        sucessos++;
      } else {
        falhas++;
        const status = resultados[i].reason?.statusCode;
        if (status === 404 || status === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscricoes[i].endpoint);
        }
      }
    }

    return res.status(200).json({ sucessos, falhas });
  } catch (err) {
    console.error('Erro no despacho de Web Push VAPID:', err);
    return res.status(500).json({ error: err.message || 'Erro interno.' });
  }
}
