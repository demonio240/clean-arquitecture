import {TodoId } from "../value-objects/TodoId";
import type { DomainEventTodo } from "./DomainEvent";

export class TodoDeletedEvent implements DomainEventTodo {
  public readonly occurredOn: string;
    public readonly name: string;
    public readonly todoId: string

  constructor(todoId: TodoId, date: Date) {
    this.occurredOn = date.toISOString();
    this.name = "TodoDeleted";
    this.todoId = todoId.value;
  }
}