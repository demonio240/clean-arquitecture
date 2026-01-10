
import { TodoTitle } from "../value-objects/TodoTitle";
import { TodoTitleAlreadyExistsError } from "../errors/TodoTitleAlreadyExistsError";
import type { TodoRepository } from "../repositories/TodoRepository";

export class TodoUniquenessChecker {
    private readonly repo: TodoRepository

  constructor(repo: TodoRepository) {
    this.repo = repo;
  }

  async ensureUnique(title: TodoTitle): Promise<void> {
    const exists = await this.repo.getByTitle(title);
    if (exists) {
      throw new TodoTitleAlreadyExistsError(title.getValue()); // Ojo: getValue() es público en tu VO?
    }
  }
}