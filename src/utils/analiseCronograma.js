import { supabase } from '../supabaseConfig';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

const BLOCOS_HORARIO = [
    { "value": "07:00-09:10", "label": "07:00 - 09:10", "turno": "Matutino" },
    { "value": "09:30-12:00", "label": "09:30 - 12:00", "turno": "Matutino" },
    { "value": "13:00-15:10", "label": "13:00 - 15:10", "turno": "Vespertino" },
    { "value": "15:30-18:00", "label": "15:30 - 18:00", "turno": "Vespertino" },
    { "value": "18:30-20:10", "label": "18:30 - 20:10", "turno": "Noturno" },
    { "value": "20:30-22:00", "label": "20:30 - 22:00", "turno": "Noturno" },
];

const TURNOS = {
    'matutino': ['07:00-09:10', '09:30-12:00'],
    'vespertino': ['13:00-15:10', '15:30-18:00'],
    'noturno': ['18:30-20:10', '20:30-22:00'],
};

/**
 * Busca aulas no Supabase com base em critérios de data e laboratório.
 * @param {object} criterios - Critérios de busca (data, mes, ano, laboratorio, termoBusca).
 * @returns {Promise<Array>} Lista de aulas encontradas.
 */
export const buscarAulasInteligente = async (criterios) => {
    try {
        let query = supabase.from('aulas').select('*');

        if (criterios.data) {
            const dataInicio = dayjs(criterios.data, 'DD/MM/YYYY').startOf('day').toISOString();
            const dataFim = dayjs(criterios.data, 'DD/MM/YYYY').endOf('day').toISOString();
            query = query.gte('data_inicio', dataInicio).lte('data_inicio', dataFim);
        } else if (criterios.mes) {
            const [mes, ano] = criterios.mes.split('/');
            const dataInicio = dayjs().month(parseInt(mes) - 1).year(parseInt(ano)).startOf('month').toISOString();
            const dataFim = dayjs().month(parseInt(mes) - 1).year(parseInt(ano)).endOf('month').toISOString();
            query = query.gte('data_inicio', dataInicio).lte('data_inicio', dataFim);
        } else if (criterios.ano) {
            const dataInicio = dayjs().year(parseInt(criterios.ano)).startOf('year').toISOString();
            const dataFim = dayjs().year(parseInt(criterios.ano)).endOf('year').toISOString();
            query = query.gte('data_inicio', dataInicio).lte('data_inicio', dataFim);
        }

        if (criterios.laboratorio) {
            query = query.eq('laboratorio', criterios.laboratorio);
        }

        const { data, error } = await query;
        if (error) throw error;

        let aulas = (data || []).map(d => ({
            ...d,
            laboratorioSelecionado: d.laboratorio,
            horarioSlotString: d.horario_slot,
            dataInicio: d.data_inicio ? dayjs(d.data_inicio).toDate() : null,
        }));

        if (criterios.termoBusca) {
            const termo = criterios.termoBusca.toLowerCase();
            aulas = aulas.filter(aula => 
                (aula.assunto && aula.assunto.toLowerCase().includes(termo)) ||
                (aula.tipo_atividade && aula.tipo_atividade.toLowerCase().includes(termo)) ||
                (aula.observacoes && aula.observacoes.toLowerCase().includes(termo))
            );
        }

        return aulas;
    } catch (error) {
        console.error('Erro ao buscar aulas:', error);
        return [];
    }
};

/**
 * Realiza a análise de dados do cronograma.
 * @param {Array} aulas - Lista de aulas para análise.
 * @param {string} tipoAnalise - Tipo de análise (ex: 'contagem_turno', 'lista_dia').
 * @param {string} [parametro] - Parâmetro adicional (ex: 'matutino', 'segunda').
 * @returns {string} Resultado da análise formatado para o usuário.
 */
export const analisarAulas = (aulas, tipoAnalise, parametro) => {
    if (!aulas || aulas.length === 0) {
        return "Não há aulas para analisar com os critérios fornecidos.";
    }

    switch (tipoAnalise) {
        case 'contagem_turno': {
            const turno = parametro.toLowerCase();
            const slotsDoTurno = TURNOS[turno];
            if (!slotsDoTurno) return `Turno '${parametro}' inválido. Use Matutino, Vespertino ou Noturno.`;

            const aulasNoTurno = aulas.filter(aula => slotsDoTurno.includes(aula.horarioSlotString));
            return `Encontrei **${aulasNoTurno.length}** aulas no turno **${parametro}** no período.`;
        }
        case 'lista_dia': {
            const aulasPorDia = aulas.reduce((acc, aula) => {
                const dia = dayjs(aula.dataInicio).format('DD/MM/YYYY (ddd)');
                if (!acc[dia]) acc[dia] = [];
                acc[dia].push(aula);
                return acc;
            }, {});

            let resultado = "Aulas encontradas:\n\n";
            for (const dia in aulasPorDia) {
                resultado += `**${dia}** (${aulasPorDia[dia].length} aulas):\n`;
                aulasPorDia[dia].forEach(aula => {
                    const horario = aula.horarioSlotString;
                    const lab = aula.laboratorioSelecionado;
                    const cursos = aula.cursos.join(', ');
                    resultado += `- ${horario} - ${aula.assunto} (${cursos}) no ${lab}\n`;
                });
                resultado += "\n";
            }
            return resultado;
        }
        case 'contagem_total':
            return `Encontrei um total de **${aulas.length}** aulas com os critérios de busca.`;
        
        default:
            return `Análise de dados concluída. Encontrei ${aulas.length} aulas.`;
    }
};

/**
 * Mapeia o nome do turno para os slots de horário.
 * @param {string} turno - Nome do turno (Matutino, Vespertino, Noturno).
 * @returns {Array<string>} Lista de slots de horário.
 */
export const getSlotsPorTurno = (turno) => {
    return TURNOS[turno.toLowerCase()] || [];
};

/**
 * Formata uma lista de aulas para exibição amigável.
 * @param {Array} aulas - Lista de aulas.
 * @returns {string} Texto formatado.
 */
export const formatarListaAulas = (aulas) => {
    if (!aulas || aulas.length === 0) {
        return "Nenhuma aula encontrada.";
    }
    let lista = `Encontrei ${aulas.length} aula(s):\n\n`;
    aulas.forEach(aula => {
        const data = dayjs(aula.dataInicio).format('DD/MM/YYYY');
        const horario = aula.horarioSlotString;
        const lab = aula.laboratorioSelecionado;
        const cursos = aula.cursos.join(', ');
        lista += `- **${aula.assunto}** (${cursos}) em ${data} das ${horario} no ${lab} (ID: ${aula.id})\n`;
    });
    return lista;
};
