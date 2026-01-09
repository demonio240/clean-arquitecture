import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { Logger } from "../../../../../shared/observability/Logger";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { Clock } from "../../../../../shared/time/SystemClock";
import type { UnitOfWork } from "../../../../../shared/uow/UnitOfWork";
import { TodoId } from "../../../domain/value-objects/TodoId";
import type { TodoDTO } from "../../dto/TodoDTO";
import { mapDomainError } from "../../errors/mapDomainError";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import type { Tx } from "../../uow/Tx";

export type UpdateTodoContentResult =
  | { status: "updated"; todo: TodoDTO }
  | { status: "no_update"; todo: TodoDTO };

export class ReopenTodo {
    private readonly metrics: Metrics
    private readonly logger: Logger
    private readonly uow: UnitOfWork<Tx>;
    private readonly date: Clock

  constructor(

    metrics: Metrics,
    logger: Logger,
    uow: UnitOfWork<Tx>,
    date: Clock
    
  ) {
    
    this.metrics = metrics;
    this.logger = logger;
    this.uow = uow;
    this.date = date
  }

  async execute(id: string, ctx: ActorContext): Promise<UpdateTodoContentResult> {
    // 1) Authz fuera del try (así no mezclas outcomes)
    this.logger.info("Intentando reabrir TODO", { todoId: id, user: ctx.userId }); 
    requirePermission(ctx, PERMISSIONS.TODO_UPDATE); // ya lanza un appError

    try {
      const result = await this.uow.transaction<UpdateTodoContentResult>(async (tx): Promise<UpdateTodoContentResult> => {
          const todoId = new TodoId(id);
          const todo = await tx.todoRepo.getById(todoId);

          if (!todo) {
            throw new TodoNotFoundError(id, "reopen");
          }

          const changed = todo.reopen(this.date.now());

          if (!changed) {
            this.metrics.increment("todo_reopen_no_update");
            return { status: "no_update", todo: {
              id: todo.id.value,
              title: todo.title,
              description: todo.description,
              status: todo.status,
              labels: todo.labels.map((l) => l.value),
            } };
          }


          await tx.todoRepo.save(todo);

          const events = todo.pullDomainEvents();
          await tx.eventBus.publish(events);
          

          this.metrics.increment("todo_reopen_success");
          this.logger.info("TODO reabierto exitosamente", { todoId: id, user: ctx.userId });

          return { status: "updated", todo: {
            id: todo.id.value,
            title: todo.title,
            description: todo.description,
            status: todo.status,
            labels: todo.labels.map((l) => l.value),
          } };
      })

      return result;
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
      
        throw appErr;
    }
  }
}
