import { Todo } from "../../../domain/entities/Todo";
import { Label } from "../../../domain/value-objects/Label";
import { TodoId } from "../../../domain/value-objects/TodoId";
import { TodoTitle } from "../../../domain/value-objects/TodoTitle";
import type { CreateTodoDTO } from "../../dto/CreateTodoDTO";
import type { TodoDTO } from "../../dto/TodoDTO";
import { TodoMapper } from "../../mappers/TodoMapper";

// Imports de Arquitectura
import type { UseCase } from "../../UseCase";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";
import { BaseUseCase } from "../../../../../shared/application/BaseUseCase";
import type { TodoNotFoundError } from "../../errors/TodoNotFound";
import { success, type Result } from "../../../../../shared/core/Result";
import type { TodoDependencies } from "../../TodoDependencies";
import type { TodoUniquenessChecker } from "../../../domain/services/TodoUniquenessChecker";

type CreateTodoErrors = TodoNotFoundError | Error;

export type CreateTodoResponse =
  | { status: "created"; todo: TodoDTO }
  | { status: "todo_id_already_exists"; todo: TodoDTO };

// Extendemos correctamente BaseUseCase
export class CreateTodo extends BaseUseCase<DomainEventTodo, Todo> implements UseCase<CreateTodoDTO, Result<CreateTodoResponse, CreateTodoErrors>> {
  
  private readonly repo: TodoDependencies["todoRepo"];
  private readonly uniquenessChecker: TodoUniquenessChecker;
  
  // Constructor limpio con dependencias unificadas
  constructor(deps: TodoDependencies) {
    super(deps.eventBus);
    this.repo = deps.todoRepo;
    // 3. CAMBIO AQUÍ: Validación de Seguridad (Guard Clause)
    // Si intentan instanciar este caso de uso sin el checker, explotamos aquí y no en tiempo de ejecución.
    if (!deps.uniquenessChecker) {
        throw new Error("Dependency 'uniquenessChecker' is required for CreateTodo use case.");
    }
    this.uniquenessChecker = deps.uniquenessChecker;
  }

  async execute(input: CreateTodoDTO): Promise<Result<CreateTodoResponse, CreateTodoErrors>> {
    // 1. Validar Permisos: ELIMINADO (Lo maneja el Decorador)

    const id = new TodoId(input.id);

    // 2. Validación de Idempotencia
    // Aquí NO usamos getAggregate porque no queremos que lance error si no existe.
    // Queremos saber si YA existe.
    const exists = await this.repo.getById(id);
    
    if (exists) {
      return success({ status: "todo_id_already_exists", todo: TodoMapper.toDTO(exists) });
    }

    // 3. Validaciones de Dominio (Service)
    const title = new TodoTitle(input.title);
    await this.uniquenessChecker.ensureUnique(title);

    // 4. Creación de la Entidad
    // Asegúrate de que Todo.create registre internamente el evento 'TodoCreatedEvent'
    const todo = Todo.create(id, title, input.description ?? "");

    // 5. Lógica adicional (Labels)
    if (input.labels) {
        for (const raw of input.labels) {
            const label = Label.create(raw, "default");
            todo.addLabel(label);
        }
    }

    // 6. Persistencia
    await this.repo.save(todo);

    // 7. Publicación de Eventos (Usando el helper de BaseUseCase)
    await this.publishEvents(todo);

    return success({ status: "created", todo: TodoMapper.toDTO(todo) });
  }
}