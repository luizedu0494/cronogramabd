import { Platform } from 'react-native';

export async function exportarRelatorioPdf(dados: any[], titulo: string) {
  if (Platform.OS === 'web') {
    const { exportarRelatorioPdf: webPdf } = await import('./exportPdf.web');
    return webPdf(dados, titulo);
  } else {
    const { exportarRelatorioPdf: nativePdf } = await import('./exportPdf.native');
    return nativePdf(dados, titulo);
  }
}

export default exportarRelatorioPdf;
