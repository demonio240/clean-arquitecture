import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import { NotFoundError } from "../../../../../shared/errors/AppError";
import type { Logger } from "../../../../../shared/observability/Logger";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { TodoId } from "../../../domain/value-objects/TodoId";
import { mapDomainError } from "../../errors/mapDomainError";

export class DeleteToDo {
    private readonly repo: TodoRepository;
    private readonly metrics: Metrics;
    private readonly logger: Logger;   

    constructor(repo: TodoRepository, metrics: Metrics, logger: Logger) {
        this.repo = repo;
        this.metrics = metrics;
        this.logger = logger;
    }

    async execute (id: string, ctx: ActorContext): Promise<void> {
        try {
            this.logger.info("Intentando eliminar TODO", { todoId: id, user: ctx.userId });
            requirePermission(ctx, PERMISSIONS.TODO_DELETE);

            const todoId = new TodoId(id);
            const todo = await this.repo.getById(todoId);
            if (!todo) {
                this.metrics.increment("todo_delete_not_found");
                this.logger.warn("TODO no encontrado al intentar eliminar", { todoId: id, user: ctx.userId });
                throw new NotFoundError(
                    "TODO_NOT_FOUND",
                    `Todo with ID ${id} not found`
                );
            }

            await this.repo.delete(todoId);
            this.metrics.increment("todo_delete_success");
            this.logger.info("TODO eliminado exitosamente", { todoId: id, user: ctx.userId });

        } catch (error) {
            this.logger.error("Error eliminando TODO", error as Error, { todoId: id, user: ctx.userId });
            this.metrics.increment("todo_delete_failure");
            throw mapDomainError(error);
        }   
    }
}