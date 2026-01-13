import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { Label } from "../../../domain/value-objects/Label";
import { TodoId } from "../../../domain/value-objects/TodoId";
import type { AddTodoLabelDTO } from "../../dto/AddTodoLabelDTO";
import type { TodoDTO } from "../../dto/TodoDTO";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import { TodoMapper } from "../../mappers/TodoMapper";
import type { UseCase } from "../../UseCase";
import type { DomainEventBus } from "../../../../../shared/events/DomainEventBus";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";


export type AddTodoLabelResult =
  | { status: "added"; todo: TodoDTO }        
  | { status: "already_exists"; todo: TodoDTO };

export class AddTodoLabel implements UseCase<AddTodoLabelDTO, AddTodoLabelResult> {

    private readonly repo: TodoRepository
        // Agregamos EventBus para consistencia con los otros comandos
    private readonly eventBus: DomainEventBus<DomainEventTodo> 
    
    constructor(
        repo: TodoRepository,
        // Agregamos EventBus para consistencia con los otros comandos
        eventBus: DomainEventBus<DomainEventTodo> 
    ) {
        this.repo = repo;
        this.eventBus = eventBus;
    }

    async execute (input: AddTodoLabelDTO, ctx: ActorContext): Promise<AddTodoLabelResult> {
        // 1. Validar permisos
        requirePermission(ctx, PERMISSIONS.TODO_UPDATE);    
          
        const todoId = new TodoId(input.id); 
        const todo = await this.repo.getById(todoId);

        if (!todo) {
            throw new TodoNotFoundError(input.id, "add_label");
        }

        // 2. Crear VO y Ejecutar Dominio
        const label = Label.create(input.label, "default");
        const wasAdded = todo.addLabel(label); 

        const todoDto = TodoMapper.toDTO(todo);

        // 3. Idempotencia
        if (!wasAdded) {
            // El decorador de observabilidad registrará el éxito de la operación (status 200)
            return { status: "already_exists", todo: todoDto };
        } 

        // 4. Persistencia
        await this.repo.save(todo);

        // 5. Publicar Eventos (Si AddLabel genera eventos internos en Todo)
        const events = todo.pullDomainEvents();
        if (events.length > 0) {
            await this.eventBus.publish(events);
        }

        return { status: "added", todo: todoDto };
    }
}