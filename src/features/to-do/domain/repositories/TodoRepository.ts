import { Todo } from "../entities/Todo";
import { TodoId } from "../value-objects/TodoId";
import type { TodoTitle } from "../value-objects/TodoTitle";

export interface TodoRepository {

  getById(id: TodoId): Promise<Todo | null>;
  save(todo: Todo): Promise<void>;
  delete(id: TodoId): Promise<void>;
  getByTitle(title: TodoTitle): Promise<Todo | null>;
  //update(todo: Todo): Promise<void>;
  //getAll(): Promise<Todo[]>;
  
}