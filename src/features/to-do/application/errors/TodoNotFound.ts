
// mover este type a otro lado si es necesario
export type TodoNotFoundReason =
  | "delete"
  | "add_label"
  | "update_content"
  | "complete"
  | "read"
  | "reopen";
  ;

export class TodoNotFoundError extends Error {
  readonly name = "TodoNotFoundError";
  readonly code = "TODO_NOT_FOUND" as const;
  public readonly TodoId: string;
  public readonly meta?: Record<string, unknown>
  public readonly reason: TodoNotFoundReason;

    constructor(
        TodoId: string,
        reason: TodoNotFoundReason,
        meta?: Record<string, unknown>
    ) {
        super(`Todo with ID ${TodoId} not found`);
        this.TodoId = TodoId;
        this.reason = reason;
        this.meta = meta;
    }



}
