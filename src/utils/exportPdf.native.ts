export async function exportarRelatorioPdf(dados: any[], titulo: string) {
  let Print: any;
  let Sharing: any;

  try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
  } catch (e) {
    console.warn('Módulos expo-print ou expo-sharing não encontrados no ambiente nativo.');
    return;
  }

  const itensHtml = dados
    .map(
      (item, index) =>
        `<li><strong>${item.assunto || 'Sem assunto'}</strong> - ${item.laboratorio || ''} (${item.status || ''})</li>`
    )
    .join('');

  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #0F172A; }
          h1 { color: #1E7EC8; }
          ul { line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>${titulo}</h1>
        <ul>${itensHtml}</ul>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html: htmlContent });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
}
