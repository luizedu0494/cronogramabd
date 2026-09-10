// Service Worker Puro (W3C Web Push API Nativa com VAPID - sem SDK Firebase)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { title: 'CronoLab', body: event.data.text() };
  }

  const { title = 'CronoLab', body = '', data = {} } = payload;

  const options = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'cronolab-geral',
    requireInteraction: data.urgente === true,
    data,
    actions: gerarAcoes(data.tipo),
    timestamp: data.dataAula ? new Date(data.dataAula).getTime() : Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

function gerarAcoes(tipo) {
  const mapa = {
    aula_adicionada:   [{ action: 'ver', title: '📅 Ver no Calendário' }],
    aula_editada:      [{ action: 'ver', title: '📅 Ver Alteração' }],
    aula_excluida:     [{ action: 'ver', title: '🗓 Ver Calendário' }],
    aprovacao_proposta:[{ action: 'ver_detalhes', title: '🔍 Detalhes' }],
    aviso_urgente:     [{ action: 'ver_aviso', title: '📢 Ver Aviso' }],
    lembrete_aula:     [{ action: 'ver', title: '📅 Ver Aula' }, { action: 'snooze', title: '🔔 +30min' }],
    evento_manutencao: [{ action: 'ver', title: '🔧 Ver Evento' }],
  };
  return mapa[tipo] ?? [{ action: 'ver', title: '🔗 Abrir CronoLab' }];
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { action } = event;
  const data = event.notification.data || {};

  const rotas = {
    ver:          `/calendario?aula=${data.aulaId ?? ''}`,
    ver_detalhes: `/gerenciar-aprovacoes?proposta=${data.aulaId ?? ''}`,
    ver_aviso:    `/avisos?aviso=${data.avisoId ?? ''}`,
    snooze:       null,
  };

  if (action === 'snooze' && data.aulaId) {
    event.waitUntil(
      new Promise(resolve => setTimeout(async () => {
        await self.registration.showNotification('🔔 Lembrete — ' + (data.assunto ?? 'Aula'), {
          body: data.body ?? '',
          tag: 'snooze-' + data.aulaId,
          data,
        });
        resolve();
      }, 30 * 60 * 1000))
    );
    return;
  }

  const url = rotas[action] ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ tipo: 'navegar', rota: url });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.tipo === 'SKIP_WAITING') self.skipWaiting();
});
