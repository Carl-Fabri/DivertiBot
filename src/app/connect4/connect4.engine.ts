export type Disc = 'R' | 'Y';
export type Cell = Disc | null;
export type Board = Cell[][]; // 6 filas x 7 columnas, fila 0 = arriba

export const ROWS = 6;
export const COLS = 7;

/** Orden de preferencia: centro primero */
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

/** Columnas donde todavía cabe una ficha */
export function legalColumns(board: Board): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === null) cols.push(c);
  }
  return cols;
}

/** Fila en la que caería una ficha en esa columna, o -1 si está llena */
export function landingRow(board: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

/** Deja caer una ficha. Devuelve nuevo tablero + fila, o null si la columna está llena */
export function drop(board: Board, col: number, disc: Disc): { board: Board; row: number } | null {
  const row = landingRow(board, col);
  if (row === -1) return null;
  const next = cloneBoard(board);
  next[row][col] = disc;
  return { board: next, row };
}

const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal desc
  [1, -1], // diagonal asc
];

/** Devuelve las 4 (o más) celdas ganadoras para `disc`, o null */
export function findWin(board: Board, disc: Disc): { r: number; c: number }[] | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== disc) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const line = [{ r, c }];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== disc) break;
          line.push({ r: nr, c: nc });
        }
        if (line.length === 4) return line;
      }
    }
  }
  return null;
}

export function isFull(board: Board): boolean {
  return legalColumns(board).length === 0;
}

/** Tablero como 6 cadenas de 7 chars usando '.', 'R', 'Y' (para mandar al modelo) */
export function boardToLines(board: Board): string[] {
  return board.map((row) => row.map((cell) => cell ?? '.').join(''));
}

const other = (disc: Disc): Disc => (disc === 'R' ? 'Y' : 'R');

/**
 * Heurística local (sin IA), usada como respaldo:
 * 1) gana si puede  2) bloquea derrota inmediata  3) evita regalar la victoria
 * 4) juega hacia el centro
 */
export function localBestMove(board: Board, disc: Disc): number {
  const legal = legalColumns(board);
  if (legal.length === 0) return -1;

  for (const c of legal) {
    const res = drop(board, c, disc);
    if (res && findWin(res.board, disc)) return c;
  }

  const opp = other(disc);
  for (const c of legal) {
    const res = drop(board, c, opp);
    if (res && findWin(res.board, opp)) return c;
  }

  const safe = legal.filter((c) => {
    const res = drop(board, c, disc);
    if (!res) return false;
    return !legalColumns(res.board).some((c2) => {
      const r2 = drop(res.board, c2, opp);
      return r2 && findWin(r2.board, opp);
    });
  });

  const pool = safe.length ? safe : legal;
  for (const c of COL_ORDER) {
    if (pool.includes(c)) return c;
  }
  return pool[0];
}
