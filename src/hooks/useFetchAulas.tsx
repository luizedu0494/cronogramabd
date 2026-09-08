import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseConfig';
import { Aula } from '../types';

export interface DateFilterOption {
  field: string;
  start: string;
  end: string;
}

export interface UseFetchAulasOptions {
  limitCount?: number | null;
  statusFilter?: string | null;
  authorFilter?: string | null;
  dateFilter?: DateFilterOption | null;
  orderByField?: string;
  orderByDirection?: 'asc' | 'desc';
}

export interface UseFetchAulasReturn {
  aulas: Aula[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const useFetchAulas = (options: UseFetchAulasOptions = {}): UseFetchAulasReturn => {
  const {
    limitCount = null,
    statusFilter = null,
    authorFilter = null,
    dateFilter = null,
    orderByField = 'created_at',
    orderByDirection = 'desc',
  } = options;

  const [aulas, setAulas] = useState<Aula[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAulas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('aulas').select('*');

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      if (authorFilter) {
        query = query.eq('proposto_por_uid', authorFilter);
      }

      if (dateFilter && dateFilter.field && dateFilter.start && dateFilter.end) {
        const campoDate = dateFilter.field === 'dataInicio' ? 'data_inicio' : dateFilter.field;
        query = query.gte(campoDate, dateFilter.start).lte(campoDate, dateFilter.end);
      }

      const campoOrder = orderByField === 'dataCriacao' ? 'created_at' : orderByField;
      query = query.order(campoOrder, { ascending: orderByDirection === 'asc' });

      if (limitCount) {
        query = query.limit(limitCount);
      }

      const { data, error: sbError } = await query;

      if (sbError) throw sbError;

      const aulasList: Aula[] = (data || []).map(data => ({
        id: data.id,
        disciplina: data.assunto || '',
        professor: data.proposto_por_nome || '',
        laboratorio: data.laboratorio || '',
        status: data.status || 'aprovada',
        turma: '',
        dataInicio: data.data_inicio || null,
        dataFim: data.data_fim || null,
        criadoEm: data.created_at || null,
        ...data,
      })) as Aula[];

      setAulas(aulasList);
    } catch (err: any) {
      console.error('Erro ao buscar aulas:', err);
      setError('Não foi possível carregar as aulas.');
    } finally {
      setLoading(false);
    }
  }, [limitCount, statusFilter, authorFilter, dateFilter, orderByField, orderByDirection]);

  useEffect(() => {
    fetchAulas();
  }, [fetchAulas]);

  return { aulas, loading, error, refetch: fetchAulas };
};

export default useFetchAulas;
