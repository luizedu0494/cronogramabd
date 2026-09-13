export default async function handler(req, res) {
  // Apenas aceita solicitações POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
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

    const candidateModels = [
      payload.model,
      'llama-3.1-8b-instant',
      'llama3-8b-8192',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ].filter(Boolean);

    const uniqueModels = [...new Set(candidateModels)];

    let lastData = {};
    let lastStatus = 500;

    for (const modelCandidate of uniqueModels) {
      const currentPayload = { ...payload, model: modelCandidate };

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify(currentPayload),
      });

      lastStatus = response.status;
      lastData = await response.json().catch(() => ({}));

      if (response.ok) {
        return res.status(200).json(lastData);
      }

      const msg = lastData?.error?.message || '';
      if (response.status !== 404 && !msg.includes('does not exist') && !msg.includes('decommissioned') && !msg.includes('not have access')) {
        return res.status(response.status).json(lastData);
      }
    }

    return res.status(lastStatus).json(lastData);
  } catch (error) {
    console.error('Erro na Vercel Function groq Proxy:', error);
    return res.status(500).json({ error: 'Erro interno ao processar requisição da IA: ' + (error.message || String(error)) });
  }
}

