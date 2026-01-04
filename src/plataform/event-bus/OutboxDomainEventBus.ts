import type { DomainEvent } from "../../shared/events/DomainEvent";
import type { DomainEventBus } from "../../shared/events/DomainEventBus";
import type { OutboxRepository } from "../../shared/outbox/OutboxRepository";
import { toOutboxMessages } from "../../shared/outbox/toOutbox";
import type { UuidGenerator } from "../system/UuidGenerator";


export class OutboxDomainEventBus implements DomainEventBus {

    private outboxRepo: OutboxRepository;
    private uuidGenerator: UuidGenerator;

  constructor(outboxRepo: OutboxRepository, uuidGenerator: UuidGenerator) {
    this.outboxRepo = outboxRepo;
    this.uuidGenerator = uuidGenerator;
  }

  async publish(events: DomainEvent[]): Promise<void> {
    
    for (const event of events) {
      // 1. Validamos que haya evento
    if (event) return;

    // 2. Convertimos los Eventos de Dominio (Objetos ricos) 
    // a Mensajes de Outbox (Estructura plana para la DB)
    //const messages = event.map(event => toOutboxMessages(event[]));
    const message = toOutboxMessages(event, this.uuidGenerator);

    // 3. Delegamos al repositorio la persistencia.
    // Esto guardará los eventos en la tabla 'outbox' de la base de datos.
    await this.outboxRepo.addMany(message);
    
    // NOTA: No ejecutamos handlers aquí. El OutboxProcessor lo hará después.
    }
  }
}