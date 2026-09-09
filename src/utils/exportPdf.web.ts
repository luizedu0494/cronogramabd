export async function exportarRelatorioPdf(dados: any[], titulo: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(titulo, 14, 20);

  doc.setFontSize(12);
  let y = 35;

  dados.forEach((item, index) => {
    const linha = `${index + 1}. ${item.assunto || 'Sem assunto'} - ${item.laboratorio || ''} (${item.status || ''})`;
    doc.text(linha, 14, y);
    y += 10;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`${titulo.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}
