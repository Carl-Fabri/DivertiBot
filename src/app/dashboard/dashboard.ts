import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Kpi {
  label: string;
  value: string;
  hint: string;
  icon: string;
}

interface Activity {
  time: string;
  text: string;
  tag: 'chiste' | 'reto' | 'dato' | 'ánimo';
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly kpis = signal<Kpi[]>([
    { label: 'Descansos hoy', value: '3', hint: 'de 5 recomendados', icon: '☕' },
    { label: 'Racha de días', value: '7', hint: '¡no la rompas!', icon: '🔥' },
    { label: 'Chistes recibidos', value: '128', hint: '+12 esta semana', icon: '😂' },
    { label: 'Ánimo medio', value: '8.2', hint: 'sobre 10', icon: '📈' },
  ]);

  protected readonly activity = signal<Activity[]>([
    { time: '09:15', text: '“¿Sabías que las nutrias duermen cogidas de la mano?”', tag: 'dato' },
    { time: '11:00', text: 'Reto: 20 sentadillas antes del próximo café.', tag: 'reto' },
    { time: '13:30', text: '“Va un pingüino y se derrite… era de chocolate.”', tag: 'chiste' },
    { time: '16:45', text: 'Llevas 3 horas dándolo todo. Respira 4-7-8 y sigue.', tag: 'ánimo' },
  ]);

  protected readonly moodBars = signal<number[]>([6, 7, 5, 8, 7, 9, 8]);
  protected readonly weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
}
