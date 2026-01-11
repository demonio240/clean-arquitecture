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
import { TodoMapper } from "../../mappers/TodoMapper";
import type { Tx } from "../../uow/Tx";

export type ReopenTodoResult =
  | { status: "reopened"; todo: TodoDTO }
  | { status: "already_open"; todo: TodoDTO }

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

  async execute(id: string, ctx: ActorContext): Promise<ReopenTodoResult> {

    this.logger.info("Intentando reabrir TODO", { todoId: id, user: ctx.userId }); 
    requirePermission(ctx, PERMISSIONS.TODO_UPDATE); 

    try {
      return await this.uow.transaction(async (tx) => {
          const todoId = new TodoId(id);
          const todo = await tx.todoRepo.getById(todoId);

          if (!todo) {
            throw new TodoNotFoundError(id, "reopen");
          }

          const wasReopened = todo.reopen(this.date.now());

          if (!wasReopened) {
            this.metrics.increment("todo_reopen_noop");
            this.logger.info("El Todo ya estaba abierto (no-op)", { todoId: id, user: ctx.userId });

            return { status: "already_open", todo: TodoMapper.toDTO(todo) };
          }
          
          await tx.todoRepo.save(todo);

          const events = todo.pullDomainEvents();
          await tx.eventBus.publish(events);
          
          this.metrics.increment("todo_reopen_success");
          this.logger.info("TODO reabierto exitosamente", { todoId: id, user: ctx.userId });

          return { status: "reopened", todo: TodoMapper.toDTO(todo) };
      })

    } catch (err) {

        const appErr = mapDomainError(err);
        const outcome = appErr.telemetry?.outcome ?? "failure"; // not_found | forbidden | validation | failure...
        
        this.metrics.increment(`todo_reopen_${outcome}`);
        
        if (outcome === "not_found" || outcome === "forbidden" || outcome === "validation") {
          
          this.logger.warn("No se pudo reabrir el TODO", { todoId: id, user: ctx.userId, code: appErr.code });
        } else {
          this.logger.error("Error reabriendo TODO", appErr, { todoId: id, user: ctx.userId });
        }
      
        throw appErr;
    }
  }
}
