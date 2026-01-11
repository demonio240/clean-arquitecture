import { Todo } from "../../../domain/entities/Todo";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { Label } from "../../../domain/value-objects/Label";
import { TodoId } from "../../../domain/value-objects/TodoId";
import { TodoTitle } from "../../../domain/value-objects/TodoTitle";
import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { CreateTodoDTO } from "../../dto/CreateTodoDTO";
import type { TodoDTO } from "../../dto/TodoDTO";
import { mapDomainError } from "../../errors/mapDomainError";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { Logger } from '../../../../../shared/observability/Logger';
import type { TodoUniquenessChecker } from "../../../domain/services/TodoUniquenessChecker";
import { TodoMapper } from "../../mappers/TodoMapper";


export type CreateTodoResult =
  | { status: "created"; todo: TodoDTO }
  | { status: "todo_id_already_exists"; todo: TodoDTO };

export class CreateTodo {
  private readonly repo: TodoRepository;
  private readonly uniquenessChecker: TodoUniquenessChecker;
  private readonly metrics: Metrics;
  private readonly logger: Logger; // Reemplazar con inyección de Logger si es necesario
  

  constructor(repo: TodoRepository, uniquenessChecker: TodoUniquenessChecker,metrics: Metrics, logger: Logger) {
    this.logger = logger;
    this.repo = repo;
    this.uniquenessChecker = uniquenessChecker;
    this.metrics = metrics;
  }

  async execute(input: CreateTodoDTO, ctx: ActorContext): Promise<CreateTodoResult> {

    this.logger.info("Intentando crear TODO", { todoId: input.id, title: input.title });
    requirePermission(ctx, PERMISSIONS.TODO_CREATE);

    try{

      const id = new TodoId(input.id);

      const exists = await this.repo.getById(id);
      if (exists){ 
        this.logger.info("Idempotencia activada: Todo ya existía", { id: input.id });
        this.metrics.increment("todo_create_idempotency_hit");

        return  { status: "todo_id_already_exists", todo: TodoMapper.toDTO(exists) };
      }

      const title = new TodoTitle(input.title);

      await this.uniquenessChecker.ensureUnique(title);

      const todo = Todo.create(id, title, input.description ?? "");

      for (const raw of input.labels ?? []) {
        const label = Label.create(raw, "default");
        todo.addLabel(label);
      }

      await this.repo.save(todo);
      this.metrics.increment("todo_created_success");
      return { status: "created", todo: TodoMapper.toDTO(todo) };

    } catch (err) { 
        
        const appErr = mapDomainError(err);
        const outcome = appErr.telemetry?.outcome ?? "failure";
        
        this.metrics.increment(`todo_created_${outcome}`);

        if (outcome === "not_found" || outcome === "forbidden" || outcome === "validation") {
          this.logger.warn("No se pudo crear el TODO", { title: input.title, code: appErr.code });
        } else {
          this.logger.error("Error creando TODO", appErr, { input });
        }

        throw appErr;
    }
  }
}