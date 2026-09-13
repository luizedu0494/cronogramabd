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

    // Busca dinâmica dos modelos ativos na Groq para evitar erros de descontinuação
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
      console.warn('Não foi possível obter lista dinâmica de modelos da Groq:', e);
    }

    const defaultActiveModels = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
    const availableList = activeModels.length > 0 ? activeModels : defaultActiveModels;

    const requestedModel = payload.model;
    const modelToUse = (requestedModel && availableList.includes(requestedModel))
      ? requestedModel
      : (availableList.find(m => m.includes('instant') || m.includes('8b')) || availableList[0]);

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

