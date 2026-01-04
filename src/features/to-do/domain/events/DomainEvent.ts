// src/domain/events/DomainEvent.ts
export interface DomainEventTodo {
  occurredOn: string;
  name: string; // Identificador del evento (ej: "TodoCompleted")
}