import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { Logger } from "../../../../../shared/observability/Logger";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { TodoId } from "../../../domain/value-objects/TodoId";
import { mapDomainError } from "../../errors/mapDomainError";


export type DeleteTodoResult = 
  | { status: "deleted" }
  | { status: "already_deleted" };


export class DeleteToDo {
    private readonly repo: TodoRepository;
    private readonly metrics: Metrics;
    private readonly logger: Logger;   

    constructor(repo: TodoRepository, metrics: Metrics, logger: Logger) {
        this.repo = repo;
        this.metrics = metrics;
        this.logger = logger;
    }

    async execute (id: string, ctx: ActorContext): Promise<DeleteTodoResult> {

        this.logger.info("Intentando eliminar TODO", { todoId: id, user: ctx.userId });
        requirePermission(ctx, PERMISSIONS.TODO_DELETE);

        try {
            
            const todoId = new TodoId(id);
            const todo = await this.repo.getById(todoId);

            if (!todo) {
                // NO-OP: El objetivo "que no exista" ya está cumplido.
                // No lanzamos error, devolvemos éxito.
                this.metrics.increment("todo_delete_noop");
                this.logger.info("DeleteToDo no-op: El Todo no existía (ya eliminado)", { todoId: id });
                
                return { status: "already_deleted" };
            }

            await this.repo.delete(todoId);

            this.metrics.increment("todo_delete_success");
            this.logger.info("TODO eliminado exitosamente", { todoId: id, user: ctx.userId });

            return { status: "deleted" };
        } catch (error) {
            const appErr = mapDomainError(error);

            const outcome = appErr.telemetry?.outcome ?? "failure";
            this.metrics.increment(`todo_delete_${outcome}`);

            if (outcome === "not_found" || outcome === "forbidden" || outcome === "validation") {
                this.logger.warn("No se pudo eliminar el TODO", { todoId: id, user: ctx.userId, code: appErr.code });
            } else {
                this.logger.error("Error eliminando TODO", appErr, { todoId: id, user: ctx.userId });
            }
            
            throw appErr;
        }   
    }
}