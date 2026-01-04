import type { DomainEventBus } from "../../shared/events/DomainEventBus";
import type { OutboxRepository } from "../../shared/outbox/OutboxRepository";
import type { Logger } from "../../shared/observability/Logger";
import type { Metrics } from "../../shared/observability/Metrics";
import type { DomainEvent } from "../../shared/events/DomainEvent";

export class OutboxProcessor {

  private readonly outboxRepo: OutboxRepository;
  private readonly eventBus: DomainEventBus;
  private readonly logger: Logger;
  private readonly metrics: Metrics;


  constructor(outboxRepo: OutboxRepository, eventBus: DomainEventBus, logger: Logger, metrics: Metrics) {
    this.outboxRepo = outboxRepo;
    this.eventBus = eventBus;
    this.logger = logger;
    this.metrics = metrics;
  }

  async runOnce(limit = 50): Promise<void> {
    const pendings = await this.outboxRepo.getUnprocessed(limit);
    if (pendings.length === 0) return;

    this.logger.info(`Procesando ${pendings.length} eventos de outbox`);

    this.metrics.increment("outbox_events_processing", { count: pendings.length.toString() });

    // 2. Intentar publicar y medir
    const publishedIds: string[] = [];

    for (const msg of pendings) {
      try {
           // 1. DESERIALIZAR: Convertimos el string JSON de vuelta a un objeto DomainEvent
           // Esto es necesario porque el InMemoryBus espera objetos, no strings.
           const domainEvent: DomainEvent = JSON.parse(msg.payload);

           // 2. PUBLICAR: Enviamos el evento "despierto" a los handlers
           await this.eventBus.publish([domainEvent]);
          
           // 3. REGISTRAR ÉXITO: Guardamos el ID único (PK), no el nombre
           // Esto es crítico para que luego el repo sepa qué fila actualizar a 'PUBLISHED'
           publishedIds.push(msg.id);
      
          // 4. MÉTRICAS: Usamos 'msg.type' (antes 'name')
          this.metrics.increment("outbox_event_published", { type: msg.type });
    
      } catch (error) {
          // LOGGING: Usamos 'msg.type' y 'msg.id' para trazar el error
          this.logger.error(
            `Fallo al publicar evento ${msg.type} (ID: ${msg.id})`, 
            error as Error
          );
          this.metrics.increment("outbox_event_failed");
      }
    }

    // 3. Marcar como procesados
    if (publishedIds.length > 0) {
      await this.outboxRepo.markProcessed(publishedIds);
      this.logger.info(`Se publicaron exitosamente ${publishedIds.length} eventos.`);
    }
  }
}
