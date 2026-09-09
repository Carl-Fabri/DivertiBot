/**
 * Extrae un texto legible de un error de HttpClient.
 *
 * El cuerpo de error (`err.error`) puede llegar de muchas formas:
 *  - nuestro backend:            { error: "texto" }
 *  - OpenRouter:                 { error: { message: "texto", code } }
 *  - Vercel (timeout/crash):     { error: { code: "FUNCTION_INVOCATION_TIMEOUT", message } }
 *  - página HTML / string suelto
 *  - error de red:               err.message
 *
 * Sin esta normalización, hacer `new Error(objeto)` acaba mostrando "[object Object]".
 */
export function toErrorMessage(err: unknown, fallback = 'No se pudo contactar con el asistente. Inténtalo de nuevo en un momento.'): string {
  const e = err as { error?: unknown; message?: unknown; status?: number };
  const body = e?.error;

  const pick = (v: unknown): string | null => {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v && typeof v === 'object') {
      const o = v as { error?: unknown; message?: unknown };
      if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
      if (typeof o.error === 'string' && o.error.trim()) return o.error.trim();
      if (o.error && typeof o.error === 'object') {
        const inner = o.error as { message?: unknown };
        if (typeof inner.message === 'string' && inner.message.trim()) return inner.message.trim();
      }
    }
    return null;
  };

  const fromBody = pick(body);
  if (fromBody) return fromBody;

  if (e?.status === 0) return 'No hay conexión con el servidor. Inténtalo de nuevo en un momento.';
  if (typeof e?.message === 'string' && e.message.trim()) return e.message.trim();
  return fallback;
}
