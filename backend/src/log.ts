import { config } from './config.js';

const NIVEIS = { debug: 10, info: 20, aviso: 30, erro: 40 } as const;
type Nivel = keyof typeof NIVEIS;

const nivelMinimo =
  NIVEIS[(config.nivelLog === 'warn' ? 'aviso' : config.nivelLog) as Nivel] ?? NIVEIS.info;

function escrever(nivel: Nivel, contexto: string, mensagem: string): void {
  if (NIVEIS[nivel] < nivelMinimo) return;
  const hora = new Date().toISOString().slice(11, 23);
  const linha = `${hora} [${contexto}] ${mensagem}`;
  if (nivel === 'erro') console.error(linha);
  else if (nivel === 'aviso') console.warn(linha);
  else console.log(linha);
}

export const log = {
  debug: (contexto: string, mensagem: string) => escrever('debug', contexto, mensagem),
  info: (contexto: string, mensagem: string) => escrever('info', contexto, mensagem),
  aviso: (contexto: string, mensagem: string) => escrever('aviso', contexto, mensagem),
  erro: (contexto: string, mensagem: string) => escrever('erro', contexto, mensagem),
};
