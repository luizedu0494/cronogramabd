import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

async function enviarMensagemTelegram(chatId, texto) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: 'HTML',
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Webhook ativo');
  }

  try {
    const { message } = req.body || {};
    if (!message || !message.text) return res.status(200).end();

    const text = message.text.trim();
    const chatId = String(message.chat.id);

    // Comando /vincular CRN-XXXX
    if (text.startsWith('/vincular ')) {
      const codigo = text.split(' ')[1]?.trim().toUpperCase();

      if (!codigo) {
        await enviarMensagemTelegram(chatId, '⚠️ Por favor, informe o código. Exemplo: <code>/vincular CRN-7X4A</code>');
        return res.status(200).end();
      }

      const { data: vinculo } = await supabaseAdmin
        .from('telegram_vinculos_pendentes')
        .select('user_uid')
        .eq('codigo', codigo)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!vinculo) {
        await enviarMensagemTelegram(chatId, '❌ Código de vinculação inválido ou expirado. Gere um novo código no CronoLab.');
        return res.status(200).end();
      }

      // Atualiza o telegram_chat_id do usuário no Supabase
      await supabaseAdmin
        .from('users')
        .update({ telegram_chat_id: chatId })
        .eq('uid', vinculo.user_uid);

      // Ativa a preferência de telegram do usuário
      await supabaseAdmin
        .from('notificacao_preferencias')
        .upsert({ user_uid: vinculo.user_uid, telegram_ativo: true }, { onConflict: 'user_uid' });

      // Remove o código temporário usado
      await supabaseAdmin
        .from('telegram_vinculos_pendentes')
        .delete()
        .eq('codigo', codigo);

      await enviarMensagemTelegram(chatId, '✅ <b>Telegram vinculado com sucesso ao CronoLab!</b>\nVocê começará a receber suas notificações personalizadas por aqui.');
      return res.status(200).end();
    }

    // Comando /desvincular
    if (text === '/desvincular') {
      await supabaseAdmin
        .from('users')
        .update({ telegram_chat_id: null })
        .eq('telegram_chat_id', chatId);

      await enviarMensagemTelegram(chatId, 'ℹ️ Seu Telegram foi desvinculado do CronoLab.');
      return res.status(200).end();
    }

    // Comando /hoje
    if (text === '/hoje') {
      const hoje = new Date().toISOString().split('T')[0];
      const { data: aulas } = await supabaseAdmin
        .from('aulas')
        .select('assunto, laboratorioSelecionado, horarioSlotString')
        .eq('status', 'aprovada')
        .eq('dataInicio', hoje);

      if (!aulas || aulas.length === 0) {
        await enviarMensagemTelegram(chatId, '📅 Nenhuma aula agendada para hoje.');
      } else {
        const lista = aulas.map((a, i) => `${i + 1}. <b>${a.assunto}</b>\n   🏢 ${a.laboratorioSelecionado} | 🕐 ${a.horarioSlotString || 'N/A'}`).join('\n\n');
        await enviarMensagemTelegram(chatId, `📅 <b>AULAS DE HOJE (${aulas.length}):</b>\n\n${lista}`);
      }
      return res.status(200).end();
    }

    // Comando /status
    if (text === '/status') {
      const { data: usuario } = await supabaseAdmin
        .from('users')
        .select('nome, role, email')
        .eq('telegram_chat_id', chatId)
        .single();

      if (!usuario) {
        await enviarMensagemTelegram(chatId, '❓ Este chat não está vinculado a nenhuma conta do CronoLab. Use <code>/vincular CODIGO</code> para conectar.');
      } else {
        await enviarMensagemTelegram(chatId, `👤 <b>CONTA VINCULADA:</b>\nNome: ${usuario.nome || 'N/A'}\nEmail: ${usuario.email}\nPerfil: ${usuario.role}`);
      }
      return res.status(200).end();
    }

    res.status(200).end();
  } catch (err) {
    console.error('Erro no webhook Telegram:', err);
    res.status(200).end();
  }
}
