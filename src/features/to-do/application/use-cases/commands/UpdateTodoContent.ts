import type { TodoRepository } from "../../../domain/repositories/TodoRepository"
import { TodoId } from "../../../domain/value-objects/TodoId";
import { TodoTitle } from "../../../domain/value-objects/TodoTitle";
import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { TodoDTO } from "../../dto/TodoDTO";
import type { UpdateTodoContentInput } from "../../dto/UpdateTodoContentDTO";
import { mapDomainError } from "../../errors/mapDomainError";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { Logger } from "../../../../../shared/observability/Logger";
import type { TodoUniquenessChecker } from "../../../domain/services/TodoUniquenessChecker";
import { TodoMapper } from "../../mappers/TodoMapper";

export type UpdateTodoContentResult =
  | { status: "updated"; todo: TodoDTO }
  | { status: "no_update"; todo: TodoDTO };


export class UpdateTodoContent {
  private readonly uniquenessChecker: TodoUniquenessChecker;
    private readonly repo: TodoRepository
    private readonly metrics: Metrics
    private readonly logger: Logger;


  constructor(
    uniquenessChecker: TodoUniquenessChecker,
    repo: TodoRepository,
    metrics: Metrics,
    logger: Logger,
  ) {
    this.uniquenessChecker = uniquenessChecker;
    this.repo = repo;
    this.metrics = metrics;
    this.logger = logger;
  }

  async execute(input: UpdateTodoContentInput, ctx: ActorContext): Promise<UpdateTodoContentResult> {
    
    this.logger.info("Intentando actualizar contenido del TODO", { todoId: input.id, user: ctx.userId });
    requirePermission(ctx, PERMISSIONS.TODO_UPDATE);

    try {
      // 1) Value Objects (validación fuerte)
      const id = new TodoId(input.id);

      // 2) Cargar agregado
      const todo = await this.repo.getById(id);
      if (!todo) throw new TodoNotFoundError(input.id, "update_content");

      let changed = false;

      // 3) Aplicar cambios (reglas del dominio adentro)

      const nextTitle = new TodoTitle(input.title ?? todo.title);

      const titleChanged = await todo.changeTitle(nextTitle, this.uniquenessChecker);
      changed = changed || titleChanged;

      if (input.description !== undefined) {
        changed = todo.changeDescription(input.description) || changed;
      }
      
      const tododto = TodoMapper.toDTO(todo);

      if (!changed) {
        this.metrics.increment("todo_update_content_no_update");
        this.logger.info("UpdateContent no-op (sin cambios)", { todoId: input.id, user: ctx.userId });
        return { status: "no_update", todo: tododto };
      }

      // 4) Persistir
      await this.repo.save(todo);

      this.metrics.increment("todo_update_content_success");
      this.logger.info("Contenido actualizado", { todoId: input.id, user: ctx.userId });
      
      return { status: "updated", todo: tododto }
    } catch (err) {
      const appErr = mapDomainError(err);

      const outcome = appErr.telemetry?.outcome ?? "failure";
      this.metrics.increment(`todo_update_content_${outcome}`);

      if (outcome === "not_found" || outcome === "forbidden" || outcome === "validation") {
        this.logger.warn("No se pudo actualizar el contenido del TODO", { todoId: input.id, user: ctx.userId, code: appErr.code });
      } else {
        this.logger.error("Error actualizando contenido del TODO", appErr, { input, user: ctx.userId });
      }
 
      throw appErr;
    }
  }
}
