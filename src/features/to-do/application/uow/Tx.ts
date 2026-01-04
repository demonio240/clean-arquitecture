import type { TodoRepository } from "../../domain/repositories/TodoRepository";
import type { DomainEventBus } from "../../../../shared/events/DomainEventBus";
import type { DomainEventTodo } from "../../domain/events/DomainEvent";


/**
 * Este Tx es de TU APP (orquestación de casos de uso),
 * no del platform.
 */
export interface Tx {
  todoRepo: TodoRepository;
  eventBus: DomainEventBus<DomainEventTodo>;
}
