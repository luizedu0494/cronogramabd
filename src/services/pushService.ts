import { supabase } from '../supabaseConfig';

export interface PushTokenMobile {
  id?: string;
  user_uid: string;
  expo_token: string;
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
  ativo: boolean;
}

export class PushService {
  /**
   * Registra ou atualiza um token push mobile (Expo / FCM / APNs) no Supabase.
   */
  async registrarTokenMobile(tokenData: {
    user_uid: string;
    expo_token: string;
    platform: 'ios' | 'android' | 'web';
    device_name?: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase.from('push_tokens_mobile').upsert(
        {
          user_uid: tokenData.user_uid,
          expo_token: tokenData.expo_token,
          platform: tokenData.platform,
          device_name: tokenData.device_name || 'Dispositivo Mobile',
          ativo: true,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'expo_token' }
      );

      if (error) {
        console.error('Erro ao registrar token push mobile no Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Erro no pushService.registrarTokenMobile:', err);
      return false;
    }
  }

  /**
   * Desativa um token push mobile ao fazer logout do dispositivo.
   */
  async desativarToken(expoToken: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('push_tokens_mobile')
        .update({ ativo: false, atualizado_em: new Date().toISOString() })
        .eq('expo_token', expoToken);

      return !error;
    } catch (err) {
      console.error('Erro ao desativar token push:', err);
      return false;
    }
  }
}

export const pushService = new PushService();
export default pushService;
