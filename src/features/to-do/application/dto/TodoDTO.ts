// src/todos/application/dto/TodoDTO.ts
export type TodoDTO = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "DONE";
  labels: string[];
};
