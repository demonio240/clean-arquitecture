/**
 * Wrapper de bajo nivel para LocalStorage.
 * Maneja el parsing de JSON y errores de IO.
 */
export class LocalStorageClient {
  getItem<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch (e) {
      console.error(`Error parsing key ${key}`, e);
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving key ${key}`, e);
      throw new Error("LocalStorageQuotaExceeded");
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

// Es como si estubiera definiendo los metodos del cliente de supbase como .from() .select() etc
// pero en este caso son los metodos para manejar el localstorage