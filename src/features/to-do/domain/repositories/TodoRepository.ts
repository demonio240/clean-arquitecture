import { Todo } from "../entities/Todo";
import { TodoId } from "../value-objects/TodoId";

export interface TodoRepository {

  getById(id: TodoId): Promise<Todo | null>;
  save(todo: Todo): Promise<void>;
  //update(todo: Todo): Promise<void>;
  //delete(id: TodoId): Promise<void>;
  //getAll(): Promise<Todo[]>;
  
}