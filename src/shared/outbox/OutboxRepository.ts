export type OutboxStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

export interface OutboxMessage {
  readonly id: string;           // 1. Necesario para actualizar la DB (PK)
  readonly type: string;         // 2. Tu campo 'name' (ej: 'TodoCompleted')
  readonly occurredOn: Date;     // 3. Cuándo sucedió (Timestamp)
  readonly payload: string;      // 4. ¡CRÍTICO! Los datos serializados (JSON)
  readonly aggregateId?: string; // 5. Opcional: ID de la entidad (ej: todoId)
  status: OutboxStatus;          // 6. Mejor que boolean para manejar reintentos
  retries: number;               // 7. Para saber cuándo rendirse
}

export interface OutboxRepository {
  addMany(messages: OutboxMessage[]): Promise<void>;
  getUnprocessed(limit: number): Promise<OutboxMessage[]>;
  markProcessed(ids: string[]): Promise<void>;
}
