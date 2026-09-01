import * as Notificacoes from 'expo-notifications';
import { Platform } from 'react-native';
import { vibrar } from './estado/preferencias';

let preparado = false;
let permitido = false;

/**
 * Avisa quando uma vaga vigiada libera.
 *
 * Notificação local, disparada pelo próprio app ao receber o evento do
 * WebSocket — não há push remoto, servidor de push nem conta na Expo. Para a
 * escala do projeto (o app aberto, esperando uma vaga), local é suficiente e
 * não adiciona infraestrutura nenhuma.
 */
export async function prepararNotificacoes(): Promise<boolean> {
  if (preparado) return permitido;
  preparado = true;

  try {
    Notificacoes.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notificacoes.setNotificationChannelAsync('vagas', {
        name: 'Vagas liberadas',
        importance: Notificacoes.AndroidImportance.HIGH,
      });
    }

    const { status } = await Notificacoes.getPermissionsAsync();
    permitido = status === 'granted';
    if (!permitido) {
      const pedido = await Notificacoes.requestPermissionsAsync();
      permitido = pedido.status === 'granted';
    }
  } catch {
    // Expo Go tem suporte parcial a notificações; sem permissão o app segue
    // funcionando e o aviso vira apenas o destaque visual no mapa.
    permitido = false;
  }

  return permitido;
}

export async function avisarVagaLiberada(vaga: string): Promise<void> {
  // A vibração vem antes da notificação de propósito: funciona mesmo sem
  // permissão concedida, e é o que se percebe com o celular no bolso.
  void vibrar('sucesso');

  if (!permitido) return;

  try {
    await Notificacoes.scheduleNotificationAsync({
      content: {
        title: `Vaga ${vaga} liberada`,
        body: 'A vaga que você está acompanhando acabou de ficar livre.',
      },
      trigger: null,
    });
  } catch {
    // Silencioso de propósito: o app não deve quebrar por causa de um aviso.
  }
}
