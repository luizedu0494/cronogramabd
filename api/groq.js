module.exports = async function handler(req, res) {
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

    // Consulta dinâmica dos modelos ativos na conta da Groq
    let activeModels = [];
    try {
      const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${groqApiKey}` }
      });
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        activeModels = (modelsData.data || [])
          .filter(m => m.active !== false && !m.id.includes('whisper'))
          .map(m => m.id);
      }
    } catch (e) {
      console.warn('Não foi possível consultar os modelos ativos:', e);
    }

    const preferredModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama3-70b-8192', 'llama3-8b-8192'];
    let modelToUse = payload.model;

    if (activeModels.length > 0) {
      if (!activeModels.includes(modelToUse)) {
        modelToUse = preferredModels.find(m => activeModels.includes(m)) || activeModels[0];
      }
    } else {
      modelToUse = 'llama-3.3-70b-versatile';
    }

    const finalPayload = { ...payload, model: modelToUse };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify(finalPayload),
    });

    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Erro na Vercel Function groq Proxy:', error);
    return res.status(500).json({ error: 'Erro interno ao processar requisição da IA: ' + (error.message || String(error)) });
  }
};

module.exports.default = module.exports;

