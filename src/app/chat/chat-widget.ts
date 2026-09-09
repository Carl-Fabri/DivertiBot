import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from './chat.service';
import { ChatMessage } from './chat.models';

const SUGGESTIONS = [
  'Cuéntame un chiste malo',
  'Dame un reto de 30 segundos',
  'Necesito motivación para seguir estudiando',
  'Un dato curioso random',
];

const CHAT_KEY = 'animobot.chat';
const MAX_STORED = 60;

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    '¡Hola! Soy ÁnimoBot 🤖. Estoy aquí para tus descansos: chistes, retos absurdos, datos curiosos o un empujón de motivación. ¿Qué necesitas?',
  at: 0,
};

function loadMessages(): ChatMessage[] {
  if (typeof localStorage === 'undefined') return [{ ...GREETING, at: Date.now() }];
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return [{ ...GREETING, at: Date.now() }];
    const arr = JSON.parse(raw);
    const valid: ChatMessage[] = Array.isArray(arr)
      ? arr.filter(
          (m: unknown): m is ChatMessage =>
            !!m &&
            ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant') &&
            typeof (m as ChatMessage).content === 'string',
        )
      : [];
    return valid.length ? valid : [{ ...GREETING, at: Date.now() }];
  } catch {
    return [{ ...GREETING, at: Date.now() }];
  }
}

function saveMessages(msgs: ChatMessage[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-MAX_STORED)));
  } catch {
    /* incógnito o storage lleno */
  }
}

@Component({
  selector: 'app-chat-widget',
  imports: [FormsModule],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWidget {
  private readonly chat = inject(ChatService);
  private readonly scrollBox = viewChild<ElementRef<HTMLElement>>('scrollBox');

  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly draft = signal('');
  protected readonly suggestions = SUGGESTIONS;

  protected readonly messages = signal<ChatMessage[]>([{ ...GREETING, at: Date.now() }]);

  constructor() {
    // En el navegador (tras la hidratación) recupera la conversación guardada…
    afterNextRender(() => {
      const stored = loadMessages();
      if (stored.length > 1) {
        this.messages.set(stored);
      }
    });
    // …y la vuelve a guardar en cada cambio.
    effect(() => saveMessages(this.messages()));
  }

  protected clearChat(): void {
    this.messages.set([{ ...GREETING, at: Date.now() }]);
    this.error.set(null);
  }

  protected toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      this.scrollToBottom();
    }
  }

  protected useSuggestion(text: string): void {
    this.draft.set(text);
    this.submit();
  }

  protected submit(): void {
    const text = this.draft().trim();
    if (!text || this.loading()) {
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: text, at: Date.now() };
    this.messages.update((list) => [...list, userMsg]);
    this.draft.set('');
    this.error.set(null);
    this.loading.set(true);
    this.scrollToBottom();

    this.chat.send(this.messages()).subscribe({
      next: (reply) => {
        this.messages.update((list) => [
          ...list,
          { role: 'assistant', content: reply, at: Date.now() },
        ]);
        this.loading.set(false);
        this.scrollToBottom();
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  protected onEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  protected retry(): void {
    // reintenta el último turno del usuario que quedó sin respuesta
    const list = this.messages();
    const lastUser = [...list].reverse().find((m) => m.role === 'user');
    if (!lastUser || this.loading()) {
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.chat.send(list).subscribe({
      next: (reply) => {
        this.messages.update((l) => [...l, { role: 'assistant', content: reply, at: Date.now() }]);
        this.loading.set(false);
        this.scrollToBottom();
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  protected trackByIndex(index: number): number {
    return index;
  }

  private scrollToBottom(): void {
    if (typeof requestAnimationFrame === 'undefined') {
      return;
    }
    requestAnimationFrame(() => {
      const el = this.scrollBox()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}
