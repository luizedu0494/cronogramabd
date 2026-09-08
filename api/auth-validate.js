// api/auth-validate.js
// Vercel Serverless Function para validar ID Token do Firebase Auth

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorização ausente ou malformatado.' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Validação usando endpoint público de verificação de token Firebase ou Admin SDK
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_WEB_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });

    const data = await response.json();
    if (!response.ok || !data.users || data.users.length === 0) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    const user = data.users[0];
    return res.status(200).json({
      valid: true,
      uid: user.localId,
      email: user.email,
      name: user.displayName,
    });
  } catch (error) {
    console.error('Erro ao validar token:', error);
    return res.status(500).json({ error: 'Erro interno ao verificar sessão.' });
  }
}
