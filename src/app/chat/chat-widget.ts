import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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

  protected readonly messages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy ÁnimoBot 🤖. Estoy aquí para tus descansos: chistes, retos absurdos, datos curiosos o un empujón de motivación. ¿Qué necesitas?',
      at: Date.now(),
    },
  ]);

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
