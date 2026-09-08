import { supabase } from '../supabaseConfig';
import dayjs from 'dayjs';

/**
 * Realiza busca pontual de todas as aulas aprovadas para um dia específico.
 * @param {string|Date|dayjs.Dayjs} data - Data a ser consultada
 * @returns {Promise<Array>} Lista de aulas encontradas
 */
export async function buscarAulasPorDia(data) {
  if (!data) return [];
  const dataStr = dayjs(data).format('YYYY-MM-DD');
  if (!dayjs(dataStr).isValid()) return [];

  const inicioStr = dayjs(dataStr).startOf('day').toISOString();
  const fimStr = dayjs(dataStr).endOf('day').toISOString();

  try {
    const { data: aulas, error } = await supabase
      .from('aulas')
      .select('*')
      .gte('data_inicio', inicioStr)
      .lte('data_inicio', fimStr)
      .eq('status', 'aprovada');

    if (error) throw error;

    return (aulas || []).map(a => ({
      ...a,
      laboratorioSelecionado: a.laboratorio,
      horarioSlotString: a.horario_slot,
      dataInicio: a.data_inicio
    }));
  } catch (error) {
    console.error('Erro ao buscar aulas por dia:', error);
    return [];
  }
}

