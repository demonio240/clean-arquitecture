import { ERROR_CODES } from "../../../domain/enums/Error_Codes";
import { TodoId } from "../../../domain/value-objects/TodoId";
import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import { NotFoundError } from "../../../../../shared/errors/AppError";
import type { CompleteTodoDTO } from "../../dto/CompleteTodoDTO";
import { mapDomainError } from "../../errors/mapDomainError";
import type { UnitOfWork } from "../../../../../shared/uow/UnitOfWork";
import type { Tx } from "../../uow/Tx";
import type { Clock } from "../../../../../shared/time/SystemClock";



export class CompleteTodo {
    private readonly uow: UnitOfWork<Tx>;
    private readonly date: Clock;

    constructor(uow: UnitOfWork<Tx>, date: Clock) {
        this.uow = uow;
        this.date = date;
    }

  async execute(input: CompleteTodoDTO, ctx: ActorContext): Promise<void> {
    try {
      requirePermission(ctx, PERMISSIONS.TODO_UPDATE);

      //llamada del metodo transaction del UoW
      await this.uow.transaction(async (tx) => {
        const todoId = new TodoId(input.id);
        const todo = await tx.todoRepo.getById(todoId);

        if (!todo) {
          throw new NotFoundError(
            ERROR_CODES.TODO_NOT_FOUND,
            `Todo with ID ${input.id} not found`
          );
        }

        todo.complete(this.date.now());
        await tx.todoRepo.save(todo);

        // ✅ después del save, sacas eventos (y limpias la mochila)
        const events = todo.pullDomainEvents();    
        await tx.eventBus.publish(events); // persistencia en outbox

      });

    } catch (error) {
      throw mapDomainError(error);
    }
  }
}
