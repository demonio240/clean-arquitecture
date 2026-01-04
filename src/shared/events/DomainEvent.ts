export abstract class DomainEvent<Payload extends Record<string, unknown> = Record<string, unknown>> {
  readonly eventName: string;
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly aggregateId: string; // El ID de la entidad que cambió (ej. el ID del Todo)
  readonly payload: Payload;    // Los datos específicos del evento

  protected constructor(
    eventName: string,
    aggregateId: string,
    payload: Payload,
    eventId?: string,
    occurredOn?: Date
  ) {
    this.eventName = eventName;
    this.aggregateId = aggregateId;
    this.payload = payload;
    this.eventId = eventId || crypto.randomUUID(); // Generación automática de ID
    this.occurredOn = occurredOn || new Date();    // Generación automática de fecha
  }
}
