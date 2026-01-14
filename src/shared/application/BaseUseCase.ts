import type { DomainEventBus } from "../events/DomainEventBus";

// Definimos T como el tipo de evento. Por defecto puede ser 'any' o 'unknown' para flexibilidad.
export abstract class BaseUseCase<T> {
  protected readonly eventBus: DomainEventBus<T>
  // Ahora el constructor acepta un bus del tipo T, no del tipo genérico DomainEvent
  constructor(eventBus: DomainEventBus<T>) {
    this.eventBus = eventBus;
  }

  /**
   * entity debe tener un método que devuelva un array de T (tus eventos específicos)
   */
  protected async publishEvents(entity: { pullDomainEvents: () => T[] }): Promise<void> {
    const events = entity.pullDomainEvents();
    
    if (events.length > 0) {
      await this.eventBus.publish(events);
    }
  }
}