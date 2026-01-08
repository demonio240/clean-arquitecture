import { Todo } from "../../../domain/entities/Todo";
import type { TodoCompletionStatus } from "../../../domain/enums/TodoStatus";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { Label } from "../../../domain/value-objects/Label";
import { TodoId } from "../../../domain/value-objects/TodoId";
import { TodoTitle } from "../../../domain/value-objects/TodoTitle";
import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { IdGenerator } from "../../../../../shared/ids/IdGenerator";
import type { CreateTodoDTO } from "../../dto/CreateTodoDTO";
import type { TodoDTO } from "../../dto/TodoDTO";
import { mapDomainError } from "../../errors/mapDomainError";
import type { Metrics } from "../../../../../shared/observability/Metrics";
import type { Logger } from '../../../../../shared/observability/Logger';


export class CreateTodo {
  private readonly repo: TodoRepository;
  private readonly idGenerator: IdGenerator
  private readonly metrics: Metrics;
  private readonly logger: Logger; // Reemplazar con inyección de Logger si es necesario



  constructor(repo: TodoRepository, idGenerator: IdGenerator, metrics: Metrics, logger: Logger) {
    this.logger = logger;
    this.repo = repo;
    this.idGenerator = idGenerator;
    this.metrics = metrics;
  }

  // RECORDAR USAR LA VALIDACION POR ROLES 
  async execute(input: CreateTodoDTO, ctx: ActorContext): Promise<TodoDTO> {

    this.logger.info("Intentando crear TODO", { user: input.title });
    requirePermission(ctx, PERMISSIONS.TODO_CREATE);

    try{

      const id = new TodoId(this.idGenerator.generate());
      const title = new TodoTitle(input.title);
  
      const todo = Todo.create(id, title, input.description ?? "");

      for (const raw of input.labels ?? []) {
        const label = Label.create(raw, "default");
        todo.addLabel(label);
      }

      await this.repo.save(todo);
      this.metrics.increment("todo_created_success");
      return todoDTO(todo);

    } catch (err) { 
      const appErr = mapDomainError(err);

      const outcome = appErr.telemetry?.outcome ?? "failure";
      this.metrics.increment(`todo_created_${outcome}`);

      if (outcome === "not_found" || outcome === "forbidden" || outcome === "validation") {
        this.logger.warn("No se pudo crear el TODO", { user: input.title, code: appErr.code });
      } else {
        this.logger.error("Error creando TODO", appErr, { input });
      }

      throw appErr;
    }
  }
}

function todoDTO(todo: Todo): TodoDTO {

  return {
    id: todo.id.value,
    title: todo.title,           
    description: todo.description,
    status: todo.status as TodoCompletionStatus,
    labels: todo.labels.map((l) => l.value),
  };

}

