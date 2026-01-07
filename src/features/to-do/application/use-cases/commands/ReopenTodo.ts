import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { Logger } from "../../../../../shared/observability/Logger";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { Clock } from "../../../../../shared/time/SystemClock";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { TodoId } from "../../../domain/value-objects/TodoId";
import { mapDomainError } from "../../errors/mapDomainError";
import { TodoNotFoundError } from "../../errors/TodoNotFound";

export class ReopenTodo {
    private readonly repo: TodoRepository
    private readonly metrics: Metrics
    private readonly logger: Logger
    private readonly date: Clock

  constructor(
    repo: TodoRepository,
    metrics: Metrics,
    logger: Logger,
    date: Clock
    
  ) {
    this.repo = repo;
    this.metrics = metrics;
    this.logger = logger;
    this.date = date
  }

  async execute(id: string, ctx: ActorContext): Promise<void> {
    // 1) Authz fuera del try (así no mezclas outcomes)
    this.logger.info("Intentando reabrir TODO", { todoId: id, user: ctx.userId }); 
    requirePermission(ctx, PERMISSIONS.TODO_UPDATE); // ya lanza un appError

    try {
      const todoId = new TodoId(id);
      const todo = await this.repo.getById(todoId);

      if (!todo) {
        // ✅ No AppError aquí; lanzas tu error del feature
        throw new TodoNotFoundError(id, "reopen");
      }

      todo.reopen(this.date.now());
      await this.repo.save(todo);

      this.metrics.increment("todo_reopen_success");
      this.logger.info("TODO reabierto exitosamente", { todoId: id, user: ctx.userId });
    } catch (err) {
        const appErr = mapDomainError(err);
        
        // 2) Métrica por outcome (sin if instanceof aquí)
        const outcome = appErr.telemetry?.outcome ?? "failure"; // not_found | forbidden | validation | failure...
        this.metrics.increment(`todo_reopen_${outcome}`);
        
        // 3) Log por severidad según outcome (evita "error" para not_found)
        if (outcome === "not_found" || outcome === "forbidden" || outcome === "validation") {
          this.logger.warn("No se pudo reabrir el TODO", { todoId: id, user: ctx.userId, code: appErr.code });
        } else {
          this.logger.error("Error reabriendo TODO", appErr, { todoId: id, user: ctx.userId });
        }
      
        // 4) swallow solo si aplica (en reopen normalmente NO aplica, pero queda genérico)
        if (appErr.telemetry?.swallow) return;
      
        throw appErr;
    }
  }
}
