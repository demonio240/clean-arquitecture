import type {                                                                                                                                                              
    OutboxMessage,                                                                                                                                                           
    OutboxRepository,                                                                                                                                                        
  } from "../../shared/outbox/OutboxRepository";                                                                                                                             
import type { LocalStorageClient } from "../storage/LocalStorageClient";
                                                                                 
  export const OUTBOX_KEY = "outbox";

  // Representacion serializada para LocalStorage.                                                                                                                           
  type StoredOutboxMessage = Omit<OutboxMessage, "occurredOn"> & {                                                                                                           
    occurredOn: string;                                                                                                                                                      
  };                                                                                                                                                                         
                                                                                                                                                                             
  type AppState = {                                                                                                                                                          
    outbox: StoredOutboxMessage[];                                                                                                                                           
  };                                                                                                                                                                         
                                                                                                                                                                             
  function serialize(message: OutboxMessage): StoredOutboxMessage {                                                                                                          
    return {                                                                                                                                                                 
      ...message,                                                                                                                                                            
      occurredOn: message.occurredOn.toISOString(),                                                                                                                          
    };                                                                                                                                                                       
  }                                                                                                                                                                          
                                                                                                                                                                             
  function deserialize(message: StoredOutboxMessage): OutboxMessage {                                                                                                        
    return {                                                                                                                                                                 
      ...message,                                                                                                                                                            
      occurredOn: new Date(message.occurredOn),                                                                                                                              
    };                                                                                                                                                                       
  }                                                                                                                                                                          
                                                                                                                                                                             
  export class LocalStorageOutboxRepository implements OutboxRepository {                                                                                                    
    private readonly client: LocalStorageClient;
    private readonly key: string = OUTBOX_KEY;
                                                                                                                                        
                                                                                                                                                                             
    constructor(cliente: LocalStorageClient ) {                                                                                                                                          
      this.client = cliente;                                                                                            
    }                                                                                                                                                                        
                                                                                                                                                                             
    async addMany(messages: OutboxMessage[]): Promise<void> {
      const state = this.client.getItem<AppState>(this.key) ?? { outbox: [] };

      for (const message of messages) {
        state.outbox.push(serialize(message));
      }

      // ✅ Persistencia real
      this.client.setItem<AppState>(this.key, state);
    }                                                                                                                                                                        
                                                                                                                                                                             
    async getUnprocessed(limit: number): Promise<OutboxMessage[]> {
      const state = this.client.getItem<AppState>(this.key) ?? { outbox: [] };

      return state.outbox
        .filter((m) => m.status === "PENDING")
        .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn)) // ISO string => orden correcto
        .slice(0, Math.max(0, limit))
        .map(deserialize);
    }                                                                                                                                                                        
                                                                                                                                                                             
    async markProcessed(ids: string[]): Promise<void> {
      const state = this.client.getItem<AppState>(this.key) ?? { outbox: [] };
      const idSet = new Set(ids);

      state.outbox = state.outbox.map((m) =>
        idSet.has(m.id) ? { ...m, status: "PUBLISHED" } : m
      );

      // ✅ Persistencia real
      this.client.setItem<AppState>(this.key, state);
    }                                                                                                                                                                        
  }
