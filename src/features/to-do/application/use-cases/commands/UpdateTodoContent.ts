import type { TodoRepository } from "../../../domain/repositories/TodoRepository"
import { TodoId } from "../../../domain/value-objects/TodoId";
import { TodoTitle } from "../../../domain/value-objects/TodoTitle";
import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import { NotFoundError } from "../../../../../shared/errors/AppError";
import type { TodoDTO } from "../../dto/TodoDTO";
import type { UpdateTodoContentInput } from "../../dto/UpdateTodoContentDTO";
import { mapDomainError } from "../../errors/mapDomainError";



export class UpdateTodoContent {

    private readonly repo: TodoRepository
  constructor(
    repo: TodoRepository,
    // opcional si ya tienes permisos:
    // private readonly authz: AuthContext
    // opcional si publicas eventos:
    // private readonly eventBus: DomainEventBus
  ) {
    this.repo = repo;
  }

  async execute(input: UpdateTodoContentInput, ctx: ActorContext): Promise<TodoDTO> {
    try {
        // 0) Validaciones de autorización (si aplica) HACER!!!!!
        requirePermission(ctx, PERMISSIONS.TODO_UPDATE);

      // 1) Value Objects (validación fuerte)
      const id = new TodoId(input.id);

      // 2) Cargar agregado
      const todo = await this.repo.getById(id);
      if (!todo) throw new NotFoundError("NOT_FOUND", `Todo with ID ${input.id} not found`);

      // 3) Aplicar cambios (reglas del dominio adentro)
      if (input.title !== undefined) {
        const title = new TodoTitle(input.title);
        // usa el método que tengas (ej: rename / changeTitle / updateTitle)
        todo.changeTitle(title);
      }

      if (input.description !== undefined) {
        // si description no tiene VO, pasa string; si tiene reglas, crea VO.
        todo.changeDescription(input.description);
      }

      // 4) Persistir
      await this.repo.save(todo);

      // 5) Eventos (si tu Todo acumula eventos)
      // const events = todo.pullDomainEvents();
      // await this.eventBus.publishAll(events);

      // 6) DTO salida
      // return TodoDTO(todo);

        const tododto: TodoDTO = {
          id: todo.id.value,
          title: todo.title,
          description: todo.description,
          status: todo.status,
          labels: todo.labels.map((l) => l.value),
        };

      return tododto;
    } catch (err) {
      throw mapDomainError(err);
    }
  }
}
