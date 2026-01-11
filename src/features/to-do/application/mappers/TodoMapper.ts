import type { Todo } from "../../domain/entities/Todo";
import type { TodoCompletionStatus } from "../../domain/enums/TodoStatus";
import type { TodoDTO } from "../dto/TodoDTO";


export class TodoMapper {
  static toDTO(todo: Todo): TodoDTO {
    return {
      id: todo.id.value,
      title: todo.title,
      description: todo.description,
      status: todo.status as TodoCompletionStatus,
      labels: todo.labels.map((l) => l.value),
    };
  }
}