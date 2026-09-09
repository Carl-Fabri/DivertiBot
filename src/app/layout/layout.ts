import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ChatWidget } from '../chat/chat-widget';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  hint: string;
}

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ChatWidget],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Layout {
  protected readonly open = signal(false);

  protected readonly nav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊', hint: 'Métricas y accesos' },
    { label: 'Conecta 4', path: '/conecta4', icon: '🔴', hint: 'Juega contra ÁnimoBot' },
    { label: 'Trivia', path: '/trivia', icon: '🧠', hint: 'Preguntas con ÁnimoBot' },
    { label: 'WaifuBot', path: '/waifubot', icon: '🐱', hint: 'Apoyo con cariño' },
  ];

  protected toggle(): void {
    this.open.update((v) => !v);
  }

  protected close(): void {
    this.open.set(false);
  }
}
