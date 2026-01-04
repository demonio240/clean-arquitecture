import type { Todo } from "../../../domain/entities/Todo";

export function GetAllToDos(): Todo[] {
    return JSON.parse(localStorage.getItem("todos") ?? "[]");
}