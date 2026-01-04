import { InvalidIdTodo } from '../errors/InvalidIdTodo';

export class TodoId {
    private readonly _value: string;


    constructor(value: string) {

        if (value.length <= 0) {
            throw new InvalidIdTodo(value.toString(), 'El ID debe ser una cadena no vacía.');
        }

        this._value = value;

    }

    get value(): string {
        return this._value;
    }

    // Para comparaciones fáciles: id1.equals(id2)
    equals(other: TodoId): boolean {
        return this._value === other.value;
    }
}