// src/todos/application/dto/CreateTodoDTO.ts
export type CreateTodoDTO = {
  title: string;
  description?: string;
  labels?: string[];
};
