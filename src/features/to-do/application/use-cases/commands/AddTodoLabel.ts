import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import { NotFoundError } from "../../../../../shared/errors/AppError";
import type { Logger } from "../../../../../shared/observability/Logger";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import { LabelAlreadyExistsError } from "../../../domain/errors/LabelAlreadyExistsError";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { Label } from "../../../domain/value-objects/Label";
import { TodoId } from "../../../domain/value-objects/TodoId";
import type { AddTodoLabelDTO } from "../../dto/AddTodoLabelDTO";
import { mapDomainError } from "../../errors/mapDomainError";

export class AddTodoLabel {
    private readonly repo: TodoRepository;
    private readonly metrics: Metrics
    private readonly logger: Logger;

    constructor(repo: TodoRepository, metrics: Metrics, logger: Logger ) {
        this.repo = repo;
        this.metrics = metrics;
        this.logger = logger;
    }

    async execute (input: AddTodoLabelDTO, ctx: ActorContext): Promise<void> {
       
        try {

            // 1) Validar permisos
            this.logger.info("Verificando permisos para agregar etiqueta al TODO", { user: ctx.userId });
            requirePermission(ctx, PERMISSIONS.TODO_UPDATE);    
          
            this.logger.info("Permisos verificados exitosamente para agregar etiqueta al TODO", { user: ctx.userId });

            // 2) Obtener el Todo
            const todoId = new TodoId(input.id); 
            const todo = await this.repo.getById(todoId);

            if (!todo) {
                this.metrics.increment("todo_label_add_not_found");
                this.logger.warn("TODO no encontrado al intentar agregar etiqueta", { todoId: input.id, user: ctx.userId });
                throw new NotFoundError(
                    "TODO_NOT_FOUND",
                    `Todo with ID ${input.id} not found`
                );
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


        } catch (error) {
            
            if (error instanceof LabelAlreadyExistsError) {
                this.metrics.increment("todo_label_add_duplicate");
                this.logger.warn("Etiqueta ya existía (no-op)", { todoId: input.id, user: ctx.userId });

            }

            throw mapDomainError(error);
        }
        
    }
}