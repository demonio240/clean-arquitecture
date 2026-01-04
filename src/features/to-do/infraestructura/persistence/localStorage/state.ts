
// infrastructure/persistence/localStorage/state.ts
export type PersistedTodo = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "DONE";
  // ...lo que necesites persistir
};

export type OutboxMessage = {
  id: string;
  name: string;
  occurredOn: string;
  payload: unknown;
  processed: boolean;
};

export type AppState = {
  todos: Record<string, PersistedTodo>;
  outbox: OutboxMessage[];
};

export const STATE_KEY = "APP_STATE_V1";

export function readState(): AppState {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) return { todos: {}, outbox: [] };
  return JSON.parse(raw) as AppState;
}

export function writeState(state: AppState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}
