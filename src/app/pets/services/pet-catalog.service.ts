import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PetCatalogService {
  private readonly species = new Set<string>(['Perro', 'Gato', 'Conejo', 'Ave']);

  private readonly colors = new Set<string>([
    'Dorado',
    'Crema',
    'Tricolor',
    'Negro',
    'Blanco y Negro',
    'Puntos cafe',
    'Marron',
    'Gris',
  ]);

  private readonly breeds = new Map<string, Set<string>>([
    [
      'Perro',
      new Set<string>([
        'Golden Retriever',
        'Labrador',
        'Beagle',
        'Border Collie',
        'Bulldog Frances',
      ]),
    ],
    [
      'Gato',
      new Set<string>(['Siames', 'Persa', 'Maine Coon', 'Criollo']),
    ],
    ['Conejo', new Set<string>(['Mini Lop', 'Holandes'])],
    ['Ave', new Set<string>(['Canario', 'Periquito'])],
  ]);

  getSpecies(query = ''): string[] {
    return this.filterAndSort(this.species, query);
  }

  hasSpecies(name: string): boolean {
    return this.findExisting(this.species, name) !== null;
  }

  addSpecies(name: string): string {
    const normalized = this.normalizeValue(name);
    const existing = this.findExisting(this.species, normalized);

    if (existing) {
      return existing;
    }

    this.species.add(normalized);
    if (!this.breeds.has(normalized)) {
      this.breeds.set(normalized, new Set<string>());
    }

    return normalized;
  }

  getBreeds(species: string, query = ''): string[] {
    const canonicalSpecies = this.findExisting(this.species, species);

    if (!canonicalSpecies) {
      return [];
    }

    const speciesBreeds = this.breeds.get(canonicalSpecies) ?? new Set<string>();
    return this.filterAndSort(speciesBreeds, query);
  }

  hasBreed(species: string, breed: string): boolean {
    return this.getBreeds(species).some(
      (item) => this.normalizeKey(item) === this.normalizeKey(breed),
    );
  }

  addBreed(species: string, breed: string): string {
    const canonicalSpecies = this.addSpecies(species);
    const normalizedBreed = this.normalizeValue(breed);
    const speciesBreeds = this.breeds.get(canonicalSpecies) ?? new Set<string>();
    const existing = this.findExisting(speciesBreeds, normalizedBreed);

    if (existing) {
      return existing;
    }

    speciesBreeds.add(normalizedBreed);
    this.breeds.set(canonicalSpecies, speciesBreeds);
    return normalizedBreed;
  }

  getColors(query = ''): string[] {
    return this.filterAndSort(this.colors, query);
  }

  hasColor(name: string): boolean {
    return this.findExisting(this.colors, name) !== null;
  }

  addColor(name: string): string {
    const normalized = this.normalizeValue(name);
    const existing = this.findExisting(this.colors, normalized);

    if (existing) {
      return existing;
    }

    this.colors.add(normalized);
    return normalized;
  }

  private filterAndSort(values: Iterable<string>, query: string): string[] {
    const normalizedQuery = this.normalizeKey(query);
    return Array.from(values)
      .filter((value) => this.normalizeKey(value).includes(normalizedQuery))
      .sort((a, b) => a.localeCompare(b));
  }

  private findExisting(values: Iterable<string>, candidate: string): string | null {
    const normalizedCandidate = this.normalizeKey(candidate);
    return (
      Array.from(values).find(
        (value) => this.normalizeKey(value) === normalizedCandidate,
      ) ?? null
    );
  }

  private normalizeValue(value: string): string {
    return value.trim();
  }

  private normalizeKey(value: string): string {
    return this.normalizeValue(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
