// src/todos/application/dto/CreateTodoDTO.ts
export type CreateTodoDTO = {
  id: string;
  title: string;
  description?: string;
  labels?: string[];
};
