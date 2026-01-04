import type { TodoId } from "../value-objects/TodoId";
import type { DomainEvent } from "./DomainEvent";

export class TodoReopenEvent implements DomainEvent {
    public readonly occurredOn: string;
    public readonly name: string;
    public readonly todoId: string
    public readonly date: Date

    constructor(todoId: TodoId, date: Date) {
        this.occurredOn = date.toString();
        this.name = "TodoReopened";
        this.todoId = todoId.value;
        this.date = date;
    }

}