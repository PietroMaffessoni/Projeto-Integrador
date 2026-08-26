import { IDS_VAGAS, type Estado } from './contrato.js';

export interface Passo {
  /** Segundos desde o início do cenário. */
  em: number;
  vaga: string;
  estado: Estado;
  /** Narração impressa no terminal — vira a fala da apresentação. */
  narracao?: string;
}

/**
 * Roteiro fixo para a defesa: sequência conhecida, tempos conhecidos, nada de
 * sorteio. O apresentador fala olhando para o celular sabendo o que vem.
 *
 * Ver docs/roteiro-demonstracao.md.
 */
export const CENARIO_APRESENTACAO: Passo[] = [
  { em: 0, vaga: 'A1', estado: 'LIVRE', narracao: 'Estacionamento vazio ao abrir o app' },
  { em: 3, vaga: 'A5', estado: 'OCUPADA', narracao: 'Primeiro carro estaciona no meio da fileira A' },
  { em: 6, vaga: 'A6', estado: 'OCUPADA' },
  { em: 9, vaga: 'B2', estado: 'OCUPADA', narracao: 'Fileira B começa a encher' },
  { em: 12, vaga: 'B3', estado: 'OCUPADA' },
  { em: 15, vaga: 'A8', estado: 'OCUPADA', narracao: 'Vaga PCD ocupada — o filtro do app mostra 1 de 2' },
  { em: 20, vaga: 'A5', estado: 'LIVRE', narracao: 'O primeiro carro sai — a vaga volta a verde na hora' },
  { em: 24, vaga: 'B7', estado: 'OCUPADA', narracao: 'Vaga de idoso ocupada' },
  { em: 28, vaga: 'A6', estado: 'LIVRE' },
  { em: 32, vaga: 'B2', estado: 'LIVRE' },
  { em: 36, vaga: 'A8', estado: 'LIVRE', narracao: 'Vaga PCD liberada' },
];

/** Estado inicial do cenário: tudo livre, para a demonstração começar limpa. */
export function estadoInicialDoCenario(): Map<string, Estado> {
  return new Map(IDS_VAGAS.map((id) => [id, 'LIVRE' as Estado]));
}
