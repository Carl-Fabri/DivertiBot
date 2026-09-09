import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface Connect4Move {
  /** columna elegida por el modelo, o null si hay que usar la heurística local */
  col: number | null;
  quip: string;
  model: string | null;
  usage: { prompt: number; completion: number; total: number };
}

const OFFLINE: Connect4Move = {
  col: null,
  quip: 'Modo local: sigo siendo rival.',
  model: null,
  usage: { prompt: 0, completion: 0, total: 0 },
};

@Injectable({ providedIn: 'root' })
export class Connect4Service {
  private readonly http = inject(HttpClient);

  /** Pide el movimiento a ÁnimoBot vía proxy. Nunca lanza: si falla, devuelve col=null. */
  chooseMove(board: string[], legalCols: number[]): Observable<Connect4Move> {
    return this.http
      .post<Connect4Move>('/api/connect4', { board, legalCols })
      .pipe(catchError(() => of(OFFLINE)));
  }
}
