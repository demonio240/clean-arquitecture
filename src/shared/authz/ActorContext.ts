// shared/authz/ActorContext.ts
import type { Permission } from "./permissions";

// “Actor” = quien está haciendo la acción (usuario/servicio)
// Solo data. NO es React Context.
export interface ActorContext {
  userId: string;

  // Roles opcionales: SIEMPRE strings para no acoplarte a nombres/enum
  roles?: string[];

  // Lo importante: permisos resueltos (por rol/DB/etc.)
  permissions: readonly Permission[];
}

// Actor invitado/anon por defecto
export const GUEST_ACTOR: ActorContext = {
  userId: "guest",
  roles: ["GUEST"],
  permissions: [],
};
