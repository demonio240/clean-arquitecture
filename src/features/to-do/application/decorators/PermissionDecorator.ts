import type { ActorContext } from "../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../shared/authz/guards";
import type { Permission } from "../../../../shared/authz/permissions";
import type { UseCase } from "../UseCase";


export class PermissionDecorator<I, O> implements UseCase<I, O> {
  private readonly next: UseCase<I, O> // El caso de uso real (o el siguiente decorador)
  private readonly requiredPermission: Permission // El permiso necesario
  constructor(
    next: UseCase<I, O>, // El caso de uso real (o el siguiente decorador)
    requiredPermission: Permission // El permiso necesario
  ) {
    this.next = next;
    this.requiredPermission = requiredPermission;
  }

  async execute(input: I, ctx: ActorContext): Promise<O> {
    // 1. Aquí centralizamos la validación
    // Si falla, requirePermission lanzará la excepción ForbiddenError
    requirePermission(ctx, this.requiredPermission);

    // 2. Si pasó la guardia, ejecutamos el caso de uso real
    return this.next.execute(input, ctx);
  }
}