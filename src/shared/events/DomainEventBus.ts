import type { DomainEvent } from "./DomainEvent";

// una implementacion de un tipo generico, solucion simple y momentanea, debe ser arreglada en el futuro
// Eñ tipo generico DM 
export interface DomainEventBus<DM> {
  publish(events: DomainEvent[] | DM[]): Promise<void>;
}
