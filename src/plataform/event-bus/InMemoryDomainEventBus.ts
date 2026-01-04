import type { DomainEvent } from "../../shared/events/DomainEvent";
import type { DomainEventBus } from "../../shared/events/DomainEventBus";
import type { Logger } from "../../shared/observability/Logger";


// Definimos el tipo de una función manejadora (subscriber)
type EventHandler = (event: DomainEvent) => Promise<void>;

export class InMemoryDomainEventBus implements DomainEventBus {
  // Un mapa donde la clave es el nombre del evento y el valor es una lista de funciones
  private logger: Logger
  private handlers = new Map<string, EventHandler[]>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // Método para registrar suscriptores (handlers)
  // Ejemplo: bus.subscribe('TodoCreated', sendWelcomeEmail)
  subscribe(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  // Método que cumple el contrato de DomainEventBus
  async publish(events: DomainEvent[]): Promise<void> {

    for (const event of events) {
      const handlers = this.handlers.get(event.eventName);

      if (!handlers || handlers.length === 0) {
        this.logger.info(`No handlers found for event: ${event.eventName}`);
        return;
      }

      this.logger.info(`Dispatching event ${event.eventName} to ${handlers.length} handlers`);

      // Ejecutamos todos los handlers. 
      // Nota: Aquí decidimos si queremos que fallen todos si uno falla (Promise.all)
      // o que sean independientes (Promise.allSettled).
      const results = await Promise.allSettled(
        handlers.map((handler) => handler(event))
      );

      // Logueamos si alguno falló
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          this.logger.error(
            `Error in handler ${index} for event ${event.eventName}`, 
            result.reason
          );
        }
      });
    }

    }
      
  }

