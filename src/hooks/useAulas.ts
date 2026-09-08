import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseConfig';
import dayjs from 'dayjs';

export const useAulasDia = (dataFormatted?: string) => {
  const targetDate = dataFormatted || dayjs().format('YYYY-MM-DD');

  return useQuery({
    queryKey: ['aulas', targetDate],
    queryFn: async () => {
      const inicio = dayjs(targetDate).startOf('day').toISOString();
      const fim = dayjs(targetDate).endOf('day').toISOString();

      const { data, error } = await supabase
        .from('aulas')
        .select('*')
        .gte('data_inicio', inicio)
        .lte('data_inicio', fim);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

