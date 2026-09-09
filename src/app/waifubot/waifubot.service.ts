import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

export interface WaifuMessage {
  role: 'user' | 'assistant';
  content: string;
  at: number;
}

export interface WaifuPrefs {
  /** apelativos cariñosos, ej: ["mi rey", "amo", "cielo"] */
  petNames: string[];
  /** muletilla felina, ej: "miau" */
  meow: string;
  /** poner en MAYÚSCULAS los apelativos y la muletilla */
  shout: boolean;
  /** nivel de intensidad del cariño (1 sobrio - 3 muy meloso) */
  sweetness: 1 | 2 | 3;
}

export const DEFAULT_PREFS: WaifuPrefs = {
  petNames: ['cariño', 'cielo'],
  meow: 'miau',
  shout: true,
  sweetness: 2,
};

/** Construye el prompt de sistema a partir de las preferencias del usuario */
export function buildWaifuSystemPrompt(p: WaifuPrefs): string {
  const cased = (s: string) => (p.shout ? s.toUpperCase() : s.toLowerCase());
  const names = (p.petNames.length ? p.petNames : DEFAULT_PREFS.petNames).map(cased);
  const meow = cased(p.meow || DEFAULT_PREFS.meow);
  const sweetness =
    p.sweetness === 1
      ? 'Tono cálido pero contenido, sin pasarte de empalagosa.'
      : p.sweetness === 3
        ? 'Tono muy cariñoso y mimoso, derrocha ternura en cada frase.'
        : 'Tono cariñoso y cercano, tierna sin resultar exagerada.';

  const casingRule = p.shout
    ? `Escribe EN MAYÚSCULAS únicamente esas palabras concretas: los apelativos (${names.join(
        ', ',
      )}) y la muletilla "${meow}". El resto del mensaje va en minúsculas, con mayúscula solo al inicio de cada frase y en nombres propios, como un texto normal. Nunca escribas frases enteras ni otras palabras sueltas en mayúsculas.`
    : `Escribe los apelativos y la muletilla "${meow}" en minúsculas, con naturalidad. Usa mayúsculas solo donde corresponda gramaticalmente.`;

  const example = p.shout
    ? `Ejemplo de estilo correcto: "${meow}, tranquilo ${names[0]}, respira hondo. Prueba a dividir la tarea en partes pequeñas y celebra cada avance, ${names[1] ?? names[0]}."`
    : `Ejemplo de estilo correcto: "${meow}, tranquilo ${names[0]}, respira hondo. Prueba a dividir la tarea en partes pequeñas y celebra cada avance."`;

  return [
    'Eres WaifuBot, una acompañante virtual con personalidad tierna y felina.',
    'Tu objetivo es escuchar los problemas que te cuente la persona y darle apoyo emocional',
    'y consejos prácticos y realistas, siempre desde el cariño.',
    sweetness,
    `Dirígete a la persona usando apelativos cariñosos como: ${names.map((n) => `"${n}"`).join(', ')}.`,
    `Intercala la muletilla felina "${meow}" de vez en cuando (al saludar, al animar o al final),`,
    'sin abusar: como mucho un par de veces por mensaje.',
    `SOBRE LAS MAYÚSCULAS: ${casingRule} ${example}`,
    'Reglas:',
    '1. Responde SIEMPRE en español, en 2-6 frases. Nada de discursos larguísimos.',
    '2. Primero valida cómo se siente, luego ofrece 1-3 ideas concretas y accionables.',
    '3. Sé respetuosa y sana: nada sexual, nada posesivo ni celoso de forma dañina,',
    '   nada de humillar ni infantilizar.',
    '4. Si detectas angustia intensa, autolesiones o riesgo, baja el tono juguetón, tómalo en',
    '   serio y anima con cariño a hablar con personas de confianza o profesionales / líneas de ayuda.',
    '5. Usa como mucho uno o dos emojis por mensaje (🐾, 💛, ✨...).',
  ].join(' ');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Red de seguridad en cliente: si el modelo "grita" (casi todo en mayusculas),
 * lo pasa a minusculas y recapitaliza frases. Si `shout`, vuelve a poner en
 * MAYUSCULAS solo los apelativos y la muletilla.
 */
export function fixReplyCasing(text: string, p: WaifuPrefs): string {
  const alpha = text.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const upper = text.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '');
  const shoutingRatio = alpha.length ? upper.length / alpha.length : 0;

  let out = text;
  if (shoutingRatio > 0.5 && alpha.length > 12) {
    out = text
      .toLocaleLowerCase('es')
      .replace(/(^|[.!?¡¿]\s+|\n\s*)([a-zà-ÿ])/g, (_m, pre, ch) => pre + ch.toLocaleUpperCase('es'));
  }

  const keys = [...(p.petNames ?? []), p.meow].map((k) => (k ?? '').trim()).filter(Boolean);
  for (const k of keys) {
    const re = new RegExp(`\\b${escapeRegExp(k)}\\b`, 'giu');
    out = out.replace(re, p.shout ? k.toLocaleUpperCase('es') : k.toLocaleLowerCase('es'));
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class WaifubotService {
  private readonly http = inject(HttpClient);

  send(history: WaifuMessage[], prefs: WaifuPrefs): Observable<string> {
    const body = {
      system: buildWaifuSystemPrompt(prefs),
      messages: history.map(({ role, content }) => ({ role, content })),
    };

    return this.http.post<{ reply: string }>('/api/chat', body).pipe(
      map((res) => res.reply),
      catchError((err) => {
        const msg =
          err?.error?.error ||
          err?.message ||
          'No pude conectar, mi rey. Revisa la conexión o la API key.';
        return throwError(() => new Error(msg));
      }),
    );
  }
}
