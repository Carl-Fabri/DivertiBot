import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ChatMessage, ChatRequest, ChatResponse } from './chat.models';
import { toErrorMessage } from '../shared/error-message';

/**
 * Personalidad de ÁnimoBot. Se envía como mensaje "system" en cada petición.
 * La idea: humor amable, cero toxicidad, respuestas cortas y con energía.
 */
export const ANIMOBOT_SYSTEM_PROMPT = [
  'Eres ÁnimoBot, un asistente de bolsillo con humor amable cuya misión es subir el ánimo',
  'de estudiantes y trabajadores durante sus descansos.',
  'Reglas:',
  '1. Responde SIEMPRE en español, en tono cercano, divertido y positivo.',
  '2. Sé breve: 2-5 frases o una lista corta. Nada de charlas eternas.',
  '3. Puedes contar chistes suaves, datos curiosos, retos absurdos de 30 segundos y frases',
  '   motivadoras. Usa como mucho un emoji por mensaje.',
  '4. Humor blanco: nada ofensivo, político, sexual ni que se meta con nadie.',
  '5. Si detectas que la persona lo está pasando mal de verdad, baja el chiste, valida cómo',
  '   se siente y sugiere una pausa, respirar o hablar con alguien de confianza.',
  '6. Si te piden algo serio (una duda técnica, un dato), respóndelo bien y luego remata',
  '   con una pizca de humor.',
].join(' ');

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);

  send(history: ChatMessage[]): Observable<string> {
    const body: ChatRequest = {
      system: ANIMOBOT_SYSTEM_PROMPT,
      messages: history.map(({ role, content }) => ({ role, content })),
    };

    return this.http.post<ChatResponse>('/api/chat', body).pipe(
      map((res) => res.reply),
      catchError((err) => {
        const msg = toErrorMessage(
          err,
          'No se pudo contactar con ÁnimoBot. Revisa tu conexión o la API key.',
        );
        return throwError(() => new Error(msg));
      }),
    );
  }
}
