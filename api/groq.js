export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const groqApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  if (!groqApiKey) {
    return res.status(500).json({ error: 'Chave GROQ_API_KEY ou VITE_GROQ_API_KEY não configurada no ambiente do servidor.' });
  }

  try {
    const { payload } = req.body || {};
    if (!payload) {
      return res.status(400).json({ error: 'Payload ausente' });
    }

    // Modelos oficiais de texto/chat da Groq que suportam saída JSON
    const supportedChatModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'mixtral-8x7b-32768'
    ];

    let modelToUse = payload.model;
    if (!modelToUse || !supportedChatModels.includes(modelToUse)) {
      modelToUse = supportedChatModels[0];
    }

    let finalPayload = { ...payload, model: modelToUse };

    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify(finalPayload),
    });

    let data = await response.json().catch(() => ({}));

    // Se falhar com qualquer erro de modelo ou formato JSON, tenta os modelos alternativos de chat
    if (!response.ok) {
      const errMsg = data?.error?.message || '';

      for (const fallbackModel of supportedChatModels) {
        if (fallbackModel === modelToUse) continue;

        const retryPayload = { ...payload, model: fallbackModel };
        const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify(retryPayload),
        });

        if (retryRes.ok) {
          data = await retryRes.json();
          return res.status(200).json(data);
        }
      }

      // Se continuar falhando por erro de sintaxe JSON ou response_format, faz nova tentativa sem a trava de response_format
      if (errMsg.includes('JSON') || errMsg.includes('response_format') || response.status === 400) {
        const { response_format, ...payloadWithoutFormat } = finalPayload;
        const retryNoFormat = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            ...payloadWithoutFormat,
            model: 'llama-3.3-70b-versatile'
          }),
        });

        if (retryNoFormat.ok) {
          data = await retryNoFormat.json();
          return res.status(200).json(data);
        }
      }
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Erro na Vercel Function groq Proxy:', error);
    return res.status(500).json({ error: 'Erro interno ao processar requisição da IA: ' + (error.message || String(error)) });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = handler;
  module.exports.default = handler;
}
