import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Connect4Service } from './connect4.service';
import {
  Board,
  Disc,
  boardToLines,
  createBoard,
  drop,
  findWin,
  isFull,
  legalColumns,
  localBestMove,
} from './connect4.engine';

type Status = 'playing' | 'win' | 'lose' | 'draw';

@Component({
  selector: 'app-connect4',
  imports: [DecimalPipe],
  templateUrl: './connect4.html',
  styleUrl: './connect4.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Connect4 {
  private readonly api = inject(Connect4Service);

  protected readonly HUMAN: Disc = 'R';
  protected readonly BOT: Disc = 'Y';

  protected readonly board = signal<Board>(createBoard());
  protected readonly turn = signal<Disc>('R');
  protected readonly status = signal<Status>('playing');
  protected readonly winCells = signal<{ r: number; c: number }[]>([]);
  protected readonly thinking = signal(false);
  protected readonly quip = signal('¡Tú empiezas! Pulsa una columna para soltar ficha.');

  protected readonly scores = signal({ won: 0, lost: 0, draw: 0 });
  protected readonly tokens = signal(0);
  protected readonly lastMoveWasLocal = signal(false);

  protected readonly legalCols = computed(() => legalColumns(this.board()));
  protected readonly myTurn = computed(
    () => this.status() === 'playing' && this.turn() === 'R' && !this.thinking(),
  );

  protected readonly rows = [0, 1, 2, 3, 4, 5];
  protected readonly cols = [0, 1, 2, 3, 4, 5, 6];

  protected play(col: number): void {
    if (!this.myTurn() || !this.legalCols().includes(col)) return;
    const terminal = this.applyMove(col, this.HUMAN);
    if (terminal) return;
    this.turn.set(this.BOT);
    this.aiMove();
  }

  protected newGame(): void {
    this.board.set(createBoard());
    this.turn.set('R');
    this.status.set('playing');
    this.winCells.set([]);
    this.thinking.set(false);
    this.lastMoveWasLocal.set(false);
    this.quip.set('Nueva partida. Tú primero 😉');
  }

  protected resetScores(): void {
    this.scores.set({ won: 0, lost: 0, draw: 0 });
    this.tokens.set(0);
  }

  protected isWinning(r: number, c: number): boolean {
    return this.winCells().some((w) => w.r === r && w.c === c);
  }

  protected statusText(): string {
    switch (this.status()) {
      case 'win':
        return '¡Ganaste! 🎉';
      case 'lose':
        return 'Gana ÁnimoBot 🤖';
      case 'draw':
        return 'Empate 🤝';
      default:
        return this.thinking() ? 'ÁnimoBot está pensando…' : 'Tu turno';
    }
  }

  private aiMove(): void {
    this.thinking.set(true);
    this.quip.set('🤖 pensando…');

    this.api.chooseMove(boardToLines(this.board()), this.legalCols()).subscribe((res) => {
      this.tokens.update((t) => t + (res.usage?.total ?? 0));

      let col = res.col;
      const usedLocal = col === null || !this.legalCols().includes(col);
      if (usedLocal) col = localBestMove(this.board(), this.BOT);
      this.lastMoveWasLocal.set(usedLocal);

      if (res.quip) this.quip.set(res.quip);

      if (col !== null && col >= 0) this.applyMove(col, this.BOT);
      this.thinking.set(false);
      if (this.status() === 'playing') this.turn.set(this.HUMAN);
    });
  }

  /** Aplica un movimiento y actualiza estado. Devuelve true si la partida terminó. */
  private applyMove(col: number, disc: Disc): boolean {
    const res = drop(this.board(), col, disc);
    if (!res) return this.status() !== 'playing';
    this.board.set(res.board);

    const win = findWin(res.board, disc);
    if (win) {
      this.winCells.set(win);
      if (disc === this.HUMAN) {
        this.status.set('win');
        this.scores.update((s) => ({ ...s, won: s.won + 1 }));
        this.quip.set('Vale, esta te la llevas… revancha ¿no? 😤');
      } else {
        this.status.set('lose');
        this.scores.update((s) => ({ ...s, lost: s.lost + 1 }));
      }
      return true;
    }

    if (isFull(res.board)) {
      this.status.set('draw');
      this.scores.update((s) => ({ ...s, draw: s.draw + 1 }));
      this.quip.set('Empate técnico. Los dos somos unos cracks.');
      return true;
    }

    return false;
  }
}
