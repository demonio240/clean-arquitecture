import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import { NotFoundError } from "../../../../../shared/errors/AppError";
import type { Logger } from "../../../../../shared/observability/Logger";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { Clock } from "../../../../../shared/time/SystemClock";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { TodoId } from "../../../domain/value-objects/TodoId";
import { mapDomainError } from "../../errors/mapDomainError";


export class ReopenTodo {
    private readonly repo: TodoRepository;
    private readonly metrics: Metrics;
    private readonly logger: Logger;
    private readonly date: Clock; // esto tiene que salir de inyección de dependencias


    constructor(repo: TodoRepository, metrics: Metrics, logger: Logger, date: Clock) {
        this.repo = repo;
        this.metrics = metrics;
        this.logger = logger;
        this.date = date;
    }

    async execute (id: string, ctx: ActorContext): Promise<void> {
        try {

            this.logger.info("Intentando reabrir TODO", { todoId: id, user: ctx.userId });
            requirePermission(ctx, PERMISSIONS.TODO_UPDATE);
            const todoId = new TodoId(id);
            const todo = await this.repo.getById(todoId);

            if (!todo) {
                this.metrics.increment("todo_reopen_not_found");
                // refactorizar para que el NotFoundError salga de los uses cases
                this.logger.warn("TODO no encontrado al intentar reabrir", { todoId: id, user: ctx.userId });
                // MotFoundError tiene que salir de los uses cases
                throw new NotFoundError( 
                    "TODO_NOT_FOUND",
                    `Todo with ID ${id} not found`
                );
            }

            todo.reopen(this.date.now());
            await this.repo.save(todo);
            this.metrics.increment("todo_reopen_success");
            this.logger.info("TODO reabierto exitosamente", { todoId: id, user: ctx.userId });

        } catch (error) {
            this.logger.error("Error reabriendo TODO", error as Error, { todoId: id, user: ctx.userId });
            this.metrics.increment("todo_reopen_failure");
            throw mapDomainError(error);    
        }   
    }
}