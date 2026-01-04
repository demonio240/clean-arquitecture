import  { Todo } from "../../../domain/entities/Todo";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import  { TodoId } from "../../../domain/value-objects/TodoId";
import { TodoTitle } from "../../../domain/value-objects/TodoTitle";
import type { LocalStorageClient } from "../../../../../plataform/storage/LocalStorageClient";
import type {PersistedTodo } from "./state";


function serializeTodo(todo: Todo): PersistedTodo {
  return {
    id: todo.id.value,                 // ajusta según tu VO
    title: todo.title,           // ajusta
    description: todo.description,     // ajusta
    status: todo.status,               // ajusta
  };
}

function deserializeTodo(raw: PersistedTodo): Todo {
  // ⚠️ aquí reconstruyes tu entidad desde raw
  // (puede ser Todo.restore(...) o new Todo(...))
   const id = new TodoId(raw.id);
   const title = new TodoTitle(raw.title);
  
  return Todo.create(
      id,
      title,
      raw.description,
    );
    
  throw new Error("Implement deserializeTodo según tu dominio");
}

export class LocalStorageTodoRepository implements TodoRepository {
    private readonly client: LocalStorageClient

  constructor(client: LocalStorageClient) {
    this.client = client;
  }

  async getById(id: TodoId): Promise<Todo | null> {
    const raw = this.client.getItem<PersistedTodo>(`todo_${id.value}`);
    //const raw = this.state.todos[id.value];
    return raw ? deserializeTodo(raw) : null;
  }

  async save(todo: Todo): Promise<void> {
    // ✅ NO localStorage.setItem aquí
    // ✅ solo muta el snapshot (state) en memoria
    this.client.setItem<PersistedTodo>(`todo_${todo.id.value}`, serializeTodo(todo));
  }
}
