import type { DomainEventBus } from "../../../shared/events/DomainEventBus";
import type { Clock } from "../../../shared/time/SystemClock";
import type { DomainEventTodo } from "../domain/events/DomainEvent";
import type { TodoRepository } from "../domain/repositories/TodoRepository";
// Si usas UniquenessChecker en CreateTodo/UpdateTodo, agrégalo aquí también
// import type { TodoUniquenessChecker } from "../../domain/services/TodoUniquenessChecker";

export interface TodoDependencies {
  todoRepo: TodoRepository;
  eventBus: DomainEventBus<DomainEventTodo>;
  date: Clock;
  // uniquenessChecker: TodoUniquenessChecker; // Descomenta cuando refactorices CreateTodo
}