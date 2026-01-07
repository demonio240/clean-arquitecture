import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { Logger } from "../../../../../shared/observability/Logger";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { Label } from "../../../domain/value-objects/Label";
import { TodoId } from "../../../domain/value-objects/TodoId";
import type { AddTodoLabelDTO } from "../../dto/AddTodoLabelDTO";
import { mapDomainError } from "../../errors/mapDomainError";
import { TodoNotFoundError } from "../../errors/TodoNotFound";

export type AddTodoLabelResult =
  | { status: "added" }
  | { status: "already_exists" };

export class AddTodoLabel {
    private readonly repo: TodoRepository;
    private readonly metrics: Metrics
    private readonly logger: Logger;

    constructor(repo: TodoRepository, metrics: Metrics, logger: Logger ) {
        this.repo = repo;
        this.metrics = metrics;
        this.logger = logger;
    }

    async execute (input: AddTodoLabelDTO, ctx: ActorContext): Promise<AddTodoLabelResult> {
        // 1) Validar permisos
        this.logger.info("Verificando permisos para agregar etiqueta al TODO", { user: ctx.userId });
        requirePermission(ctx, PERMISSIONS.TODO_UPDATE);    
          
        this.logger.info("Permisos verificados exitosamente para agregar etiqueta al TODO", { user: ctx.userId });
        
        try {
            // 2) Obtener el Todo
            const todoId = new TodoId(input.id); 
            const todo = await this.repo.getById(todoId);

            if (!todo) {
                throw new TodoNotFoundError(input.id, "add_label");
            }

            // 3) Crear VO
            const label =  Label.create(input.label, "default");

            // 4) Mutar dominio (si addLabel puede detectar duplicado, mejor)
            todo.addLabel(label); 

            //persistir
            await this.repo.save(todo);

            // observabilidad
            this.metrics.increment("todo_label_add_success");
            this.logger.info("Etiqueta agregada exitosamente al TODO", { 
                todoId: input.id, 
                label: label.value, 
                user: ctx.userId, 
            });

            return { status: "added" };

        } catch (error) {
            const appErr = mapDomainError(error);

            const outcome = appErr.telemetry?.outcome ?? "failure";
            this.metrics.increment(`todo_label_add_${outcome}`);

            if (outcome === "not_found" || outcome === "forbidden" || outcome === "validation") {
                this.logger.warn("No se pudo agregar la etiqueta al TODO", { 
                    todoId: input.id, 
                    label: input.label, 
                    user: ctx.userId, 
                    code: appErr.code 
                });
            } else {
                this.logger.error("Error agregando etiqueta al TODO", appErr, { 
                    todoId: input.id, 
                    label: input.label, 
                    user: ctx.userId 
                });
            }

            //Recordar usar swallow en los demas uses cases y analizar si aplican en los demas uses cases
            if (appErr.telemetry?.swallow) {
                this.logger.info("Etiqueta duplicada (no-op)", {
                    todoId: input.id,
                    label: input.label,
                    user: ctx.userId,
                    code: appErr.code,
                });
                return { status: "already_exists" };
            }

            throw appErr;
        }
    }
}