import { InvalidTodoLabel } from "../errors/InvalidTodoLabel";

export class Label {

    public readonly name: string;
    public readonly color: string;

    private constructor(name: string,  color: string) {

        // validaciones adicionales pueden ir aquí si es necesario

        this.name = name;
        this.color = color;
    }

    public static create(raw: string, color: string): Label {
        const normalized = Label.normalize(raw);

        if (normalized.length < 2) {
            throw new InvalidTodoLabel(raw, "El nombre de la etiqueta es demasiado corto.");
        }

        return new Label(normalized, color);
    }

    private static normalize(raw: string): string {
        return raw
        .trim()
        .replace(/\s+/g, " ")   // colapsa espacios múltiples
        .toLowerCase();         // ignora mayúsculas/minúsculas
    }

    public  equals(other: Label): boolean {
        return this.value === other.value;
    }

    public get value(): string {
        return this.name;
    }
}