import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { Logger } from "../../../../../shared/observability/Logger";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { Label } from "../../../domain/value-objects/Label";
import { TodoId } from "../../../domain/value-objects/TodoId";
import type { AddTodoLabelDTO } from "../../dto/AddTodoLabelDTO";

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

            this.logger.info("Verificando permisos para agregar etiqueta al TODO", { user: ctx.userId });
            requirePermission(ctx, PERMISSIONS.TODO_CREATE);    
          
            this.logger.info("Permisos verificados exitosamente para agregar etiqueta al TODO", { user: ctx.userId });

            const todoId = new TodoId(input.id); 
            const todo = await this.repo.getById(todoId);

            if (!todo) {
                this.logger.warn("TODO no encontrado al intentar agregar etiqueta", { todoId: input.id });
                throw new Error(`Todo with ID ${input.id} not found`);
            }

            const label =  Label.create(input.label, "default");

            todo.addLabel(label);

            await this.repo.save(todo);

            this.metrics.increment("todo_label_added_success");
            this.logger.info("Etiqueta agregada exitosamente al TODO", { todoId: input.id, label: label.value });


        } catch (error) {
            this.logger.error("Permisos insuficientes para agregar etiqueta al TODO", error as Error, { user: ctx.userId });
            this.metrics.increment("todo_label_added_failure");
            throw error;
        }
        
    }
}