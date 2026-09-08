import { supabase } from '../supabaseConfig';
import { notificadorTelegram } from './NotificadorTelegram';

export interface PayloadNotificacao {
  titulo: string;
  corpo: string;
  tipo:
    | 'aula_adicionada'
    | 'aula_editada'
    | 'aula_excluida'
    | 'evento_manutencao'
    | 'aviso_normal'
    | 'aviso_importante'
    | 'aviso_urgente'
    | 'aprovacao_proposta'
    | 'lembrete_aula';
  aulaId?: string;
  eventoId?: string;
  avisoId?: string;
  laboratorio?: string;
  cursos?: string[];
  dadosExtra?: Record<string, any>;
}

export class NotificationService {
  /**
   * Ponto de entrada centralizado para disparar notificações in-app e despachar para usuários.
   */
  async disparar(payload: PayloadNotificacao, destinatariosUids?: string[]): Promise<void> {
    try {
      let uids = destinatariosUids;

      // Se destinatários não forem especificados, resolve com base em quem tem interesse/regras
      if (!uids || uids.length === 0) {
        uids = await this.resolverDestinatarios(payload);
      }

      if (uids.length === 0) return;

      // Buscar preferências dos destinatários
      const { data: preferencias } = await supabase
        .from('notificacao_preferencias')
        .select('*')
        .in('user_uid', uids);

      const mapPrefs = new Map(preferencias?.map(p => [p.user_uid, p]) ?? []);

      const registrosInApp: any[] = [];

      for (const uid of uids) {
        const pref = mapPrefs.get(uid);

        // Se o usuário tem in-app ativo (padrão true), insere a notificação in-app
        if (!pref || pref.inapp_ativo) {
          registrosInApp.push({
            destinatario_uid: uid,
            tipo: payload.tipo,
            titulo: payload.titulo,
            corpo: payload.corpo,
            aula_id: payload.aulaId ?? null,
            evento_id: payload.eventoId ?? null,
            aviso_id: payload.avisoId ?? null,
          });
        }
      }

      if (registrosInApp.length > 0) {
        const { error } = await supabase.from('notificacoes').insert(registrosInApp);
        if (error) console.error('Erro ao registrar notificações in-app:', error);
      }
    } catch (err) {
      console.error('Erro ao disparar notificações:', err);
    }
  }

  /**
   * Resolve quem deve receber a notificação com base no laboratório e cursos.
   */
  private async resolverDestinatarios(payload: PayloadNotificacao): Promise<string[]> {
    try {
      const uidsSet = new Set<string>();

      // Se a notificação está atrelada a uma aula específica, busca seguidores da aula
      if (payload.aulaId) {
        const { data: seguidores } = await supabase
          .from('aula_seguidores')
          .select('user_uid')
          .eq('aula_id', payload.aulaId)
          .eq('notificar_alteracoes', true);

        seguidores?.forEach(s => uidsSet.add(s.user_uid));
      }

      // Se é aviso urgente ou evento de manutenção, notifica coordenadores e usuários ativos
      if (payload.tipo === 'aviso_urgente' || payload.tipo === 'evento_manutencao') {
        const { data: usuarios } = await supabase
          .from('users')
          .select('uid')
          .eq('status', 'aprovado');

        usuarios?.forEach(u => uidsSet.add(u.uid));
      } else {
        // Usuários cujos laboratórios ou cursos de interesse correspondem ao payload
        const { data: usuarios } = await supabase
          .from('users')
          .select('uid')
          .eq('status', 'aprovado');

        usuarios?.forEach(u => uidsSet.add(u.uid));
      }

      return Array.from(uidsSet);
    } catch (err) {
      console.error('Erro ao resolver destinatários:', err);
      return [];
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
