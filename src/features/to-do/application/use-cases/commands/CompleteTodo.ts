import { TodoId } from "../../../domain/value-objects/TodoId";
import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { CompleteTodoDTO } from "../../dto/CompleteTodoDTO";
import { mapDomainError } from "../../errors/mapDomainError";
import type { UnitOfWork } from "../../../../../shared/uow/UnitOfWork";
import type { Tx } from "../../uow/Tx";
import type { Clock } from "../../../../../shared/time/SystemClock";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { Logger } from "../../../../../shared/observability/Logger";



export class CompleteTodo {
    private readonly uow: UnitOfWork<Tx>;
    private readonly metrics: Metrics
    private readonly logger: Logger
    private readonly date: Clock;

    constructor(uow: UnitOfWork<Tx>, metrics: Metrics, logger: Logger, date: Clock) {
        this.uow = uow;
        this.metrics = metrics;
        this.logger = logger;
        this.date = date;
    }

  async execute(input: CompleteTodoDTO, ctx: ActorContext): Promise<void> {
    try {
      requirePermission(ctx, PERMISSIONS.TODO_UPDATE);

      //llamada del metodo transaction del UoW
      await this.uow.transaction(async (tx) => {
        const todoId = new TodoId(input.id);
        const todo = await tx.todoRepo.getById(todoId);

        if (!todo) {
          throw new TodoNotFoundError(input.id, "complete");
        }

        todo.complete(this.date.now());
        await tx.todoRepo.save(todo);

        // ✅ después del save, sacas eventos (y limpias la mochila)
        const events = todo.pullDomainEvents();    
        await tx.eventBus.publish(events); // persistencia en outbox

      });

    } catch (error) {
      const appErr = mapDomainError(error);

      const outcome = appErr.telemetry?.outcome ?? "failure";
      this.metrics.increment(`todo_complete_${outcome}`);

      if (outcome === "not_found" || outcome === "forbidden" || outcome === "validation") {
        this.logger.warn("No se pudo completar el TODO", { todoId: input.id, user: ctx.userId, code: appErr.code });
      } else {
        this.logger.error("Error completando TODO", appErr, { todoId: input.id, user: ctx.userId });
      }

      if (appErr.telemetry?.swallow) return;
      

      throw appErr;
    }
  }
}
