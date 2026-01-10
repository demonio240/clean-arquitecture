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

  getAllWithPrefix<T>(prefix: string): T[] {
    const items: T[] = [];
    
    // Iteramos sobre todo el LocalStorage del navegador
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && key.startsWith(prefix)) {
        // Reutilizamos tu getItem seguro con try/catch
        const val = this.getItem<T>(key);
        if (val) {
          items.push(val);
        }
      }
    }
    return items;
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

// Es como si estubiera definiendo los metodos del cliente de supbase como .from() .select() etc
// pero en este caso son los metodos para manejar el localstorage