export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** epoch ms; sólo para mostrar la hora en la UI */
  at: number;
}

export interface ChatRequest {
  messages: Pick<ChatMessage, 'role' | 'content'>[];
  system?: string;
  model?: string;
}

export interface ChatResponse {
  reply: string;
  model: string;
}

export interface ChatError {
  error: string;
}
