// shared/authz/guards.ts
import type { ActorContext } from "./ActorContext";
import { ForbiddenError } from "./ForbiddenError";
import type { Permission } from "./permissions";


export function hasPermission(actor: ActorContext, required: Permission): boolean {
  return actor.permissions.includes(required);
}

export function hasAnyPermission(actor: ActorContext, required: readonly Permission[]): boolean {
  return required.some((p) => actor.permissions.includes(p));
}

export function hasAllPermissions(actor: ActorContext, required: readonly Permission[]): boolean {
  return required.every((p) => actor.permissions.includes(p));
}

export function requirePermission(actor: ActorContext, required: Permission): void {
  if (!hasPermission(actor, required)) {
    throw new ForbiddenError(required, {
      mode: "ONE",
      required,
    });
  }
}

export function requireAnyPermission(actor: ActorContext, required: readonly Permission[]): void {
  if (!hasAnyPermission(actor, required)) {
    throw new ForbiddenError(undefined, {
      mode: "ANY",
      required: [...required],
    });
  }
}

export function requireAllPermissions(actor: ActorContext, required: readonly Permission[]): void {
  const missing = required.filter((p) => !actor.permissions.includes(p)); 

  if (missing.length > 0) {
    throw new ForbiddenError(missing[0], {
      mode: "ALL",
      required: [...required],
      missing,
    });
  }
}
