import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MetadataStore {
  // Signal para almacenar todos los enums en caché
  private readonly enumsCache = signal<Record<string, string[]>>({});

  setEnums(enums: Record<string, string[]>): void {
    this.enumsCache.set(enums);
  }

  // Método sincrónico para consultar enums ya cacheados
  getEnumValues(enumName: string): string[] {
    const cache = this.enumsCache();
    return cache[enumName] ?? [];
  }
}
