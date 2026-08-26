import Constants from 'expo-constants';

const PORTA_BACKEND = 3333;

/**
 * Descobre o endereço do backend sozinho.
 *
 * O erro nº 1 ao rodar o app no celular é apontar para `localhost` — que, no
 * telefone, é o próprio telefone. Como o Expo já serve o bundle a partir do IP
 * da máquina de desenvolvimento, esse mesmo IP é, em 99% dos casos, o endereço
 * do backend. Deriva-se dali e ninguém precisa editar arquivo.
 *
 * Ordem de precedência:
 *   1. EXPO_PUBLIC_API_URL (rede diferente, backend noutra máquina)
 *   2. extra.apiUrl no app.json
 *   3. IP do servidor de desenvolvimento do Expo + porta 3333
 *   4. localhost (emulador rodando na própria máquina)
 */
function descobrirUrlDaApi(): string {
  const doAmbiente = process.env.EXPO_PUBLIC_API_URL;
  if (doAmbiente) return doAmbiente.replace(/\/$/, '');

  const doAppJson = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (doAppJson) return doAppJson.replace(/\/$/, '');

  // "192.168.0.10:8081" — host do Metro bundler.
  const hostDoExpo = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const ip = hostDoExpo?.split(':')[0];
  if (ip) return `http://${ip}:${PORTA_BACKEND}`;

  return `http://localhost:${PORTA_BACKEND}`;
}

export const URL_API = descobrirUrlDaApi();

/** Mesmo host do REST: o Socket.IO sobe no mesmo servidor HTTP. */
export const URL_SOCKET = URL_API;

export const config = {
  urlApi: URL_API,
  urlSocket: URL_SOCKET,
  /** Tempo máximo esperando o snapshot inicial antes de mostrar erro. */
  timeoutRequisicaoMs: 8_000,
} as const;
