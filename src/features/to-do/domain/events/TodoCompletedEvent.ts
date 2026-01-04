import type { TodoId } from "../value-objects/TodoId";
import type { DomainEvent } from "./DomainEvent";

// src/domain/events/TodoCompletedEvent.ts
export class TodoCompletedEvent implements DomainEvent {
    public readonly occurredOn: string;
    public readonly name: string;
    public readonly todoId: string

  constructor(todoId: TodoId, date: Date) {
    this.occurredOn = date.toISOString();
    this.name = "TodoCompleted";
    this.todoId = todoId.value;
  }
}