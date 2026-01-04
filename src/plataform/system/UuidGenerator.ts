import type { IdGenerator } from "../../shared/ids/IdGenerator";

export class UuidGenerator implements IdGenerator {
  generate(): string {
    // Opción A: Usando la API nativa (moderna, sin instalar nada extra)
    return crypto.randomUUID(); 
    
    // Opción B: Si usas la librería 'uuid' (npm install uuid)
    // import { v4 as uuidv4 } from 'uuid';
    // return uuidv4();
  }
}