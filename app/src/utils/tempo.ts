/** "há 3 min", "há 2 h" — o suficiente para julgar se o dado ainda vale. */
export function tempoRelativo(segundos: number | null): string {
  if (segundos === null) return 'sem registro';
  if (segundos < 10) return 'agora';
  if (segundos < 60) return `há ${segundos} s`;

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  return `há ${dias} d`;
}

export function horaCurta(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function dataHoraCurta(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

export function porcentagem(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}
