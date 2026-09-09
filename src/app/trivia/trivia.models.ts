export interface TriviaQuestion {
  q: string;
  options: string[];
  /** índice (0-3) de la opción correcta */
  answer: number;
  /** dato curioso corto que muestra ÁnimoBot al responder */
  fun: string;
}

export interface TriviaResponse {
  questions: TriviaQuestion[];
  source: 'ia' | 'local';
  usage: { prompt: number; completion: number; total: number };
}

export const TRIVIA_CATEGORIES = [
  'General',
  'Ciencia',
  'Historia',
  'Cine y series',
  'Deporte',
  'Naturaleza',
] as const;

export type TriviaCategory = (typeof TRIVIA_CATEGORIES)[number];
