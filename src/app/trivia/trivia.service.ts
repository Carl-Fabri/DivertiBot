import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { TriviaQuestion, TriviaResponse } from './trivia.models';
import { pickLocal } from './trivia.bank';

@Injectable({ providedIn: 'root' })
export class TriviaService {
  private readonly http = inject(HttpClient);

  /**
   * Pide un lote de preguntas en UNA sola llamada (barato en tokens).
   * Si no hay IA disponible, cae al banco local sin romper nada.
   */
  getQuestions(count: number, category: string): Observable<TriviaResponse> {
    return this.http.post<TriviaResponse>('/api/trivia', { count, category }).pipe(
      map((res) => {
        const questions = sanitize(res?.questions);
        return questions.length
          ? { ...res, questions }
          : { questions: pickLocal(count), source: 'local' as const, usage: zero() };
      }),
      catchError(() =>
        of({ questions: pickLocal(count), source: 'local' as const, usage: zero() }),
      ),
    );
  }
}

const zero = () => ({ prompt: 0, completion: 0, total: 0 });

/** descarta preguntas mal formadas que vengan del modelo */
function sanitize(list: unknown): TriviaQuestion[] {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (x): x is TriviaQuestion =>
      !!x &&
      typeof x.q === 'string' &&
      Array.isArray(x.options) &&
      x.options.length === 4 &&
      x.options.every((o: unknown) => typeof o === 'string') &&
      Number.isInteger(x.answer) &&
      x.answer >= 0 &&
      x.answer <= 3 &&
      typeof x.fun === 'string',
  );
}
