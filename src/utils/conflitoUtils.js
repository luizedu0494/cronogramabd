import dayjs from 'dayjs';
import { supabase } from '../supabaseConfig';
import { notificadorTelegram } from '../services/NotificadorTelegram';

const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

/**
 * Converte string de horário "HH:mm-HH:mm" ou similares em minutos para comparação.
 */
function converterHoraParaMinutos(horaStr) {
  if (!horaStr) return null;
  const limpo = String(horaStr).replace(/[^\d:]/g, '');
  const partes = limpo.split(':');
  if (partes.length < 2) return null;
  const h = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function verificarColisao(inicio1, fim1, inicio2, fim2) {
  const mI1 = converterHoraParaMinutos(inicio1);
  const mF1 = converterHoraParaMinutos(fim1);
  const mI2 = converterHoraParaMinutos(inicio2);
  const mF2 = converterHoraParaMinutos(fim2);
  if (mI1 === null || mF1 === null || mI2 === null || mF2 === null) return true;
  return Math.max(mI1, mI2) < Math.min(mF1, mF2);
}

/**
 * Busca propostas pendentes no mesmo laboratório e horário e altera status para 'rejeitada',
 * enviando notificação no Telegram.
 */
export async function autoRejeitarPendentesConflitantes({
  laboratorioSelecionado,
  dataInicio,
  dataFim,
  horarioSlotString,
  assuntoAgendamento,
  idAgendamentoIgnorar
}) {
  if (!dataInicio) return [];

  const dtInicio = dayjs(dataInicio.toDate ? dataInicio.toDate() : dataInicio);
  if (!dtInicio.isValid()) return [];

  const inicioDia = dtInicio.startOf('day').toISOString();
  const fimDia = dtInicio.endOf('day').toISOString();

  try {
    const { data: pendentes, error } = await supabase
      .from('aulas')
      .select('*')
      .gte('data_inicio', inicioDia)
      .lte('data_inicio', fimDia)
      .eq('status', 'pendente');

    if (error || !pendentes || pendentes.length === 0) return [];

    const novohInicio = dtInicio.format('HH:mm');
    const novohFim = dataFim ? dayjs(dataFim.toDate ? dataFim.toDate() : dataFim).format('HH:mm') : novohInicio;

    const pendentesRejeitadas = [];

    for (const pData of pendentes) {
      if (idAgendamentoIgnorar && String(pData.id) === String(idAgendamentoIgnorar)) continue;

      const mesmoLab = laboratorioSelecionado === 'Todos' ||
        !pData.laboratorio ||
        pData.laboratorio === laboratorioSelecionado;

      if (!mesmoLab) continue;

      let pInicio = null;
      let pFim = null;
      if (pData.horario_slot) {
        const slotStr = Array.isArray(pData.horario_slot) ? pData.horario_slot[0] : pData.horario_slot;
        const [i, f] = slotStr.split('-');
        pInicio = i;
        pFim = f;
      }

      if (!pInicio || !pFim) {
        const pDtI = dayjs(pData.data_inicio);
        const pDtF = dayjs(pData.data_fim);
        if (pDtI.isValid()) pInicio = pDtI.format('HH:mm');
        if (pDtF.isValid()) pFim = pDtF.format('HH:mm');
      }

      const colidiu = verificarColisao(novohInicio, novohFim, pInicio, pFim);

      if (colidiu) {
        const motivo = `Rejeitada automaticamente por sobreposição com agendamento do coordenador: "${assuntoAgendamento || 'Agendamento Direto'}"`;

        await supabase
          .from('aulas')
          .update({
            status: 'rejeitada',
            observacoes: pData.observacoes ? `${pData.observacoes}\n[MOTIVO REJEIÇÃO]: ${motivo}` : motivo,
            updated_at: new Date().toISOString()
          })
          .eq('id', pData.id);

        if (TELEGRAM_CHAT_ID) {
          const dtNotif = dayjs(pData.data_inicio);
          await notificadorTelegram.enviarNotificacao(
            TELEGRAM_CHAT_ID,
            {
              assunto: pData.assunto,
              data: dtNotif.isValid() ? dtNotif.format('DD/MM/YYYY') : 'N/A',
              dataISO: dtNotif.isValid() ? dtNotif.format('YYYY-MM-DD') : null,
              horario: pData.horario_slot || `${pInicio}-${pFim}`,
              laboratorio: pData.laboratorio || laboratorioSelecionado,
              cursos: pData.cursos || [],
              observacoes: `Proposta cancelada devido ao agendamento de "${assuntoAgendamento || 'Aula/Evento'}" pelo coordenador.`,
              propostoPorNome: pData.proposto_por_nome || 'Técnico',
              isRevisao: pData.is_revisao || false,
              isProva: pData.is_prova || false,
            },
            'rejeitada'
          );
        }

        pendentesRejeitadas.push({ id: pData.id, ...pData });
      }
    }

    return pendentesRejeitadas;
  } catch (error) {
    console.error('Erro ao auto-rejeitar pendências conflitantes:', error);
    return [];
  }
}

