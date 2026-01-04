// 1. Definimos el objeto (esto es JS real y se mantiene)
export const TodoCompletionStatus = {
  DONE: 'DONE',
  PENDING: 'PENDING',
} as const;

// 2. Extraemos el tipo (esto desaparece al compilar)
export type TodoCompletionStatus = (typeof TodoCompletionStatus)[keyof typeof TodoCompletionStatus];