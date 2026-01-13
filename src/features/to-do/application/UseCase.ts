// shared/application/UseCase.ts

import type { ActorContext } from "../../../shared/authz/ActorContext";


// Definimos que TODO caso de uso recibe un Input (I) y devuelve un Output (O)
export interface UseCase<I, O> {
  execute(input: I, ctx: ActorContext): Promise<O>;
}