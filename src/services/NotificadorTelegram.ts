import { notificationService } from './notificationService';
import { DadosNotificacaoTelegram } from './NotificadorTelegram';

/**
 * NotificadorUnificado - Substitui a dependência direta do Telegram
 * Gravando notificações na tabela `notificacoes` do Supabase.
 * A inserção dispara automaticamente os push notifications via Database Webhook.
 */
class NotificadorUnificado {
  async enviarNotificacao(
    destinatarioUid: string,
    dados: DadosNotificacaoTelegram,
    tipoNotificacao: string
  ): Promise<boolean> {
    if (!destinatarioUid) return false;

    try {
      const titulo = this.gerarTitulo(dados, tipoNotificacao);
      const corpo = this.gerarCorpo(dados);

      await notificationService.criarNotificacao({
        destinatario_uid: destinatarioUid,
        tipo: this.mapearTipo(tipoNotificacao),
        titulo,
        corpo,
      });

      return true;
    } catch (err) {
      console.error(`Erro ao enviar notificação in-app/push para ${destinatarioUid}:`, err);
      return false;
    }
  }

  private mapearTipo(tipo: string): any {
    switch (tipo) {
      case 'adicionar':
      case 'aprovada':
        return 'aula_adicionada';
      case 'editar':
        return 'aula_editada';
      case 'excluir':
        return 'aula_excluida';
      case 'pendente':
      case 'rejeitada':
        return 'aprovacao_proposta';
      default:
        return tipo.startsWith('evento_') ? 'evento_manutencao' : 'aviso_normal';
    }
  }

  private gerarTitulo(dados: DadosNotificacaoTelegram, tipo: string): string {
    if (tipo === 'adicionar' || tipo === 'aprovada') return `Nova Aula: ${dados.assunto || 'Agendada'}`;
    if (tipo === 'editar') return `Aula Atualizada: ${dados.assunto || 'Alteração'}`;
    if (tipo === 'excluir') return `Aula Cancelada: ${dados.assunto || 'Removida'}`;
    if (tipo === 'pendente') return `Nova Proposta Pendente: ${dados.assunto}`;
    if (tipo === 'rejeitada') return `Proposta Rejeitada: ${dados.assunto}`;
    if (tipo.startsWith('evento_')) return `Evento/Manutenção: ${dados.titulo || 'Aviso'}`;
    return dados.titulo || 'Notificação CronoLab';
  }

  private gerarCorpo(dados: DadosNotificacaoTelegram): string {
    const lab = Array.isArray(dados.laboratorio) ? dados.laboratorio.join(', ') : dados.laboratorio || '';
    const hor = Array.isArray(dados.horario) ? dados.horario.join(', ') : dados.horario || '';
    return `${dados.data ? `Data: ${dados.data} ` : ''}${hor ? `| Horário: ${hor} ` : ''}${lab ? `| Lab: ${lab}` : ''}`.trim();
  }
}

export const notificadorTelegram = new NotificadorUnificado();
export default NotificadorUnificado;
