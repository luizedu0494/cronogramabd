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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Erro na Vercel Function groq Proxy:', error);
    return res.status(500).json({ error: 'Erro interno ao processar requisição da IA: ' + (error.message || String(error)) });
  }
}

