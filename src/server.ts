import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

/**
 * Carga variables de entorno desde un archivo `.env` (Node 20.6+).
 * Se intentan varias rutas porque el "cwd" cambia entre `ng serve` y `node dist/...`.
 */
function loadEnv(): void {
  const candidates = [
    join(process.cwd(), '.env'),
    join(import.meta.dirname, '../../.env'),
    join(import.meta.dirname, '../../../.env'),
  ];
  for (const path of candidates) {
    try {
      process.loadEnvFile(path);
      return;
    } catch {
      // se prueba la siguiente ruta
    }
  }
}
loadEnv();

const browserDistFolder = join(import.meta.dirname, '../browser');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

interface OpenRouterResult {
  ok: boolean;
  status: number;
  reply: string;
  model: string;
  usage: { prompt: number; completion: number; total: number };
  error?: string;
}

/**
 * Llamada única y compartida a OpenRouter. Mantiene la API key en el servidor.
 */
async function callOpenRouter(
  messages: { role: string; content: string }[],
  opts: { maxTokens: number; temperature: number },
): Promise<OpenRouterResult> {
  const apiKey = process.env['OPENROUTER_API_KEY'];
  const model = process.env['OPENROUTER_MODEL']?.trim() || DEFAULT_MODEL;
  const empty = { prompt: 0, completion: 0, total: 0 };

  if (!apiKey) {
    return { ok: false, status: 500, reply: '', model, usage: empty, error: 'NO_API_KEY' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env['OPENROUTER_SITE_URL'] || 'http://localhost:4200',
        'X-Title': process.env['OPENROUTER_SITE_NAME'] || 'AnimoSpace',
      },
      body: JSON.stringify({ model, messages, temperature: opts.temperature, max_tokens: opts.maxTokens }),
      signal: controller.signal,
    });

    const data: any = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return {
        ok: false,
        status: upstream.status === 429 ? 429 : 502,
        reply: '',
        model,
        usage: empty,
        error: data?.error?.message || `OpenRouter ${upstream.status} ${upstream.statusText}`,
      };
    }

    return {
      ok: true,
      status: 200,
      reply: (data?.choices?.[0]?.message?.content ?? '').trim(),
      model: data?.model ?? model,
      usage: {
        prompt: data?.usage?.prompt_tokens ?? 0,
        completion: data?.usage?.completion_tokens ?? 0,
        total: data?.usage?.total_tokens ?? 0,
      },
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      status: aborted ? 504 : 500,
      reply: '',
      model,
      usage: empty,
      error: aborted ? 'TIMEOUT' : 'UNEXPECTED',
    };
  } finally {
    clearTimeout(timeout);
  }
}

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json({ limit: '256kb' }));

/**
 * Chat de ÁnimoBot. El navegador nunca ve la API key.
 * Body: { messages: {role, content}[], system?: string }
 */
app.post('/api/chat', async (req, res) => {
  const body = req.body ?? {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    res.status(400).json({ error: 'Se requiere al menos un mensaje en "messages".' });
    return;
  }

  const payload = [
    ...(typeof body.system === 'string' && body.system.trim()
      ? [{ role: 'system', content: body.system.trim() }]
      : []),
    ...messages
      .filter(
        (m: any) =>
          m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'),
      )
      .slice(-20)
      .map((m: any) => ({ role: m.role, content: m.content })),
  ];

  const result = await callOpenRouter(payload, { maxTokens: 600, temperature: 0.9 });

  if (!result.ok) {
    const message =
      result.error === 'NO_API_KEY'
        ? 'Falta OPENROUTER_API_KEY. Crea un archivo .env (mira .env.example) y reinicia el servidor.'
        : result.error === 'TIMEOUT'
          ? 'El modelo tardó demasiado en responder. Inténtalo de nuevo.'
          : result.error || 'Error al contactar con OpenRouter.';
    res.status(result.status).json({ error: message });
    return;
  }

  res.json({ reply: result.reply, model: result.model, usage: result.usage });
});

/**
 * Movimiento de ÁnimoBot en el Conecta 4.
 * Body: { board: string[6], legalCols: number[] }   (fila 0 = arriba, '.' vacío, 'R' humano, 'Y' bot)
 * Respuesta SIEMPRE 200 para que el juego no se rompa:
 *   { col: number | null, quip: string, model: string | null, usage }
 * Si `col` es null el cliente decide con su heurística local.
 */
const QUIP_FALLBACKS = [
  'Tú tira, que yo improviso 😎',
  'Modo local activado, sigo peligroso.',
  'Sin internet pero con actitud.',
  'Esta la calculo yo solito.',
];

app.post('/api/connect4', async (req, res) => {
  const body = req.body ?? {};
  const board: unknown = body.board;
  const legalCols: number[] = Array.isArray(body.legalCols)
    ? body.legalCols.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 6)
    : [];

  const validBoard =
    Array.isArray(board) && board.length === 6 && board.every((r) => typeof r === 'string' && r.length === 7);

  if (!validBoard || legalCols.length === 0) {
    res.status(400).json({ error: 'Formato inválido: board debe ser string[6] y legalCols no vacío.' });
    return;
  }

  const system =
    "Juegas al Conecta 4 como ÁnimoBot con fichas 'Y'. El humano usa 'R'. Te doy el tablero: " +
    "6 filas de 7 caracteres, la fila de arriba primero, '.' = hueco vacío. Elige la MEJOR columna: " +
    '1) gana si tienes 4 en línea disponibles, 2) si no, bloquea si el rival gana en su próximo turno, ' +
    '3) si no, juega hacia el centro. Responde SOLO JSON compacto sin explicaciones: ' +
    '{"col": <numero de columna 0-6>, "quip": "<pique corto en español, máximo 8 palabras>"}';

  const user = `Tablero:\n${(board as string[]).join('\n')}\nColumnas jugables: ${legalCols.join(',')}`;

  const result = await callOpenRouter(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { maxTokens: 80, temperature: 0.7 },
  );

  const fallbackQuip = QUIP_FALLBACKS[Math.floor(Math.random() * QUIP_FALLBACKS.length)];

  if (!result.ok) {
    res.json({ col: null, quip: fallbackQuip, model: null, usage: result.usage });
    return;
  }

  // Extrae { col, quip } de la respuesta (tolera bloques ```json ... ```)
  let col: number | null = null;
  let quip = '';
  const cleaned = result.reply.replace(/```(?:json)?/gi, '').trim();
  try {
    const parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
    if (Number.isInteger(parsed?.col)) col = parsed.col;
    if (typeof parsed?.quip === 'string') quip = parsed.quip.trim().slice(0, 120);
  } catch {
    const m = cleaned.match(/"?col"?\s*[:=]\s*(\d)/i);
    if (m) col = Number(m[1]);
    const q = cleaned.match(/"?quip"?\s*[:=]\s*"([^"]+)"/i);
    if (q) quip = q[1].slice(0, 120);
  }

  if (col === null || !legalCols.includes(col)) col = null; // el cliente usará su heurística

  res.json({ col, quip: quip || fallbackQuip, model: result.model, usage: result.usage });
});

/**
 * Genera un lote de preguntas de trivia en UNA sola llamada (barato en tokens).
 * Body: { count?: number (1-10), category?: string }
 * Respuesta SIEMPRE 200:
 *   { questions: {q, options[4], answer, fun}[], source: 'ia' | 'local', usage }
 * Si `questions` viene vacío, el cliente usa su banco local.
 */
app.post('/api/trivia', async (req, res) => {
  const body = req.body ?? {};
  const count = Math.min(Math.max(Number(body.count) || 5, 1), 10);
  const category =
    typeof body.category === 'string' && body.category.trim()
      ? body.category.trim().slice(0, 40)
      : 'General';

  const system =
    'Eres ÁnimoBot y creas preguntas de trivia en español, entretenidas y de dificultad media. ' +
    'Devuelve SOLO JSON válido, sin texto alrededor, con esta forma exacta: ' +
    '{"questions":[{"q":"pregunta","options":["opción A","opción B","opción C","opción D"],' +
    '"answer":<índice 0-3 de la correcta>,"fun":"dato curioso muy corto (máx 15 palabras)"}]}. ' +
    'Las 4 opciones deben ser plausibles y distintas. Nada de política ni temas sensibles.';

  const user = `Genera ${count} preguntas de la categoría "${category}".`;

  const result = await callOpenRouter(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { maxTokens: 1100, temperature: 0.8 },
  );

  if (!result.ok) {
    res.json({ questions: [], source: 'local', usage: result.usage });
    return;
  }

  let questions: unknown[] = [];
  const cleaned = result.reply.replace(/```(?:json)?/gi, '').trim();
  try {
    const slice = cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1);
    const parsed = JSON.parse(slice);
    if (Array.isArray(parsed?.questions)) questions = parsed.questions;
  } catch {
    questions = [];
  }

  const valid = questions
    .filter(
      (q: any) =>
        q &&
        typeof q.q === 'string' &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((o: unknown) => typeof o === 'string') &&
        Number.isInteger(q.answer) &&
        q.answer >= 0 &&
        q.answer <= 3 &&
        typeof q.fun === 'string',
    )
    .slice(0, count);

  res.json({
    questions: valid,
    source: valid.length ? 'ia' : 'local',
    usage: result.usage,
  });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
