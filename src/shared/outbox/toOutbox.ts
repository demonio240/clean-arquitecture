
import type { OutboxMessage } from "../../shared/outbox/OutboxRepository";
import type { DomainEvent } from "../events/DomainEvent";
import type { IdGenerator } from "../ids/IdGenerator";

export function toOutboxMessages(events: DomainEvent[], uuidGenerator: IdGenerator): OutboxMessage[] {
  return events.map((event: DomainEvent,) => ({
    // 1. Generamos un ID único para el registro de la tabla outbox (no es el ID del evento)
    id: uuidGenerator.generate(),
    
    // 2. Mapeamos el nombre del evento al campo 'type'
    type: event.eventName, 
    
    // 3. Preservamos la fecha original del evento
    occurredOn: event.occurredOn,
    
    // 4. Opcional: Guardamos el ID del agregado (ej: todoId) para facilitar búsquedas/orden
    aggregateId: event.aggregateId, 
    
    // 5. CRÍTICO: Serializamos el evento completo a string (JSON)
    // Esto permite recuperarlo tal cual en el futuro para procesarlo.
    payload: JSON.stringify(event), 
    
    // 6. Estado inicial para que el OutboxProcessor lo encuentre
    status: 'PENDING',
    
    // 7. Contador de reintentos inicializado en 0
    retries: 0
  }));
}

