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
import { BaseUseCase } from "../../../../../shared/application/BaseUseCase";
import { failure, success, type Result } from "../../../../../shared/core/Result";

type AddLabelTodoErrors = TodoNotFoundError | Error;

export type AddLabelTodoResponse =
  | { status: "added"; todo: TodoDTO }        
  | { status: "already_exists"; todo: TodoDTO };

export class AddTodoLabel extends BaseUseCase<DomainEventTodo> implements UseCase<AddTodoLabelDTO, Result<AddLabelTodoResponse, AddLabelTodoErrors>> {

    private readonly repo: TodoRepository
        // Agregamos EventBus para consistencia con los otros comandos
    readonly eventBus: DomainEventBus<DomainEventTodo> 
    
    constructor(
        repo: TodoRepository,
        // Agregamos EventBus para consistencia con los otros comandos
        eventBus: DomainEventBus<DomainEventTodo> 
    ) {
        super(eventBus)
        this.repo = repo;
        this.eventBus = eventBus;
    }

    async execute (input: AddTodoLabelDTO, ctx: ActorContext): Promise<Result<AddLabelTodoResponse, AddLabelTodoErrors>> {
        // 1. Validar permisos
        requirePermission(ctx, PERMISSIONS.TODO_UPDATE);    
          
        const todoId = new TodoId(input.id); 
        const todo = await this.repo.getById(todoId);

        if (!todo) {
            return failure(new TodoNotFoundError(input.id, "reopen"));
            
        }

        // 2. Crear VO y Ejecutar Dominio
        const label = Label.create(input.label, "default");
        const wasAdded = todo.addLabel(label); 

        const todoDto = TodoMapper.toDTO(todo);

        // 3. Idempotencia
        if (!wasAdded) {
            // El decorador de observabilidad registrará el éxito de la operación (status 200)
            return success({ status: "already_exists", todo: todoDto });
        } 

        // 4. Persistencia
        await this.repo.save(todo);

        // 5. Publicar Eventos (Si AddLabel genera eventos internos en Todo)
        const events = todo.pullDomainEvents();
        if (events.length > 0) {
            await this.eventBus.publish(events);
        }

        return success({ status: "added", todo: todoDto });
    }
}