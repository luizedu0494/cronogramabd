import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.VITE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      botConfigured: Boolean(token),
      chatConfigured: Boolean(chatId),
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === 'POST') {
    try {
      const { mensagem, tipo, dados } = req.body || {};

      if (!mensagem) {
        return res.status(400).json({ error: 'Parâmetro mensagem é obrigatório' });
      }

      if (!token || !chatId) {
        console.warn('Bot Token ou Chat ID do Telegram não configurados em variáveis de ambiente.');
        return res.status(500).json({ error: 'Credenciais do Telegram não configuradas no servidor.' });
      }

      const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: mensagem,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.description || 'Erro ao enviar mensagem ao Telegram');
      }

      return res.status(200).json({ success: true, messageId: data.result?.message_id });
    } catch (err) {
      console.error('Erro no telegram-webhook handler:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
