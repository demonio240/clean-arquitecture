import { failure, success, type Result } from "../core/Result";
import type { DomainEventBus } from "../events/DomainEventBus";

// Definimos T como el tipo de evento. Por defecto puede ser 'any' o 'unknown' para flexibilidad.
export abstract class BaseUseCase<TEvent, TEntity> {
  protected readonly eventBus: DomainEventBus<TEvent>
  // Ahora el constructor acepta un bus del tipo T, no del tipo genérico DomainEvent
  constructor(eventBus: DomainEventBus<TEvent>) {
    this.eventBus = eventBus;
  }

  /**
   * entity debe tener un método que devuelva un array de T (tus eventos específicos)
   */
    protected async publishEvents(entity: { pullDomainEvents: () => TEvent[] }): Promise<void> {
      const events = entity.pullDomainEvents();
      
      if (events.length > 0) {
        await this.eventBus.publish(events);
      }
    }
  
    protected async getAggregate<TId>(
      id: string,
      repo: { 
        getById: (id: TId) => Promise<TEntity | null> 
      },
      createId: (rawId: string) => TId,
      // CAMBIO AQUÍ: Ahora recibimos una función que devuelve el error
      createError: (id: string) => Error,
    ): Promise<Result<TEntity, Error>> {

      const domainId = createId(id);
      const entity = await repo.getById(domainId);

      if (!entity) {
        // Ejecutamos la función para obtener el error específico configurado por el hijo
        return failure(createError(id));
      }

      return success(entity);
    }

} 