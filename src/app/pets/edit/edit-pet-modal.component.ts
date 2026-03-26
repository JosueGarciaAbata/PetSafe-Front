import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { PetCatalogService } from '../services/pet-catalog.service';
import { PetApiResponse, PetGender, PetSterilized } from '../models/pet.model';

@Component({
  selector: 'app-edit-pet-modal',
  standalone: true,
  imports: [FormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatRadioModule],
  templateUrl: './edit-pet-modal.component.html',
  styleUrl: './edit-pet-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPetModalComponent {
  private readonly catalog = inject(PetCatalogService);
  private _pet!: PetApiResponse;

  protected editGender: PetGender = 'Macho';
  protected editSterilized: PetSterilized = 'No';
  protected speciesValue = '';
  protected breedValue = '';
  protected colorValue = '';

  @Input({ required: true })
  set pet(value: PetApiResponse) {
    this._pet = value;
    this.editGender = value.genero;
    this.editSterilized = value.esterilizado;

    const canonicalSpecies = this.catalog.addSpecies(value.especie);
    this.speciesValue = canonicalSpecies;

    if (value.raza?.trim()) {
      this.breedValue = this.catalog.addBreed(canonicalSpecies, value.raza);
    } else {
      this.breedValue = '';
    }

    this.colorValue = this.catalog.addColor(value.color);
  }

  get pet(): PetApiResponse {
    return this._pet;
  }

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  protected close(): void {
    this.closed.emit();
  }

  protected save(): void {
    this.saved.emit();
  }

  protected setGender(gender: PetGender): void {
    this.editGender = gender;
  }

  protected setSterilized(value: PetSterilized): void {
    this.editSterilized = value;
  }

  protected buildTutorName(): string {
    return `${this.pet.tutor.nombre} ${this.pet.tutor.apellido}`.trim();
  }

  protected speciesOptions(): string[] {
    return this.catalog.getSpecies(this.speciesValue);
  }

  protected breedOptions(): string[] {
    const species = this.speciesValue.trim();
    if (!species) {
      return [];
    }

    return this.catalog.getBreeds(species, this.breedValue);
  }

  protected colorOptions(): string[] {
    return this.catalog.getColors(this.colorValue);
  }

  protected canCreateSpecies(): boolean {
    const value = this.speciesValue.trim();
    return value.length > 0 && !this.catalog.hasSpecies(value);
  }

  protected createSpecies(): void {
    const canonicalSpecies = this.catalog.addSpecies(this.speciesValue);
    this.speciesValue = canonicalSpecies;
    this.syncBreedWithSpecies();
  }

  protected onSpeciesChanged(value: string): void {
    this.speciesValue = value;
    this.syncBreedWithSpecies();
  }

  protected selectSpecies(value: string): void {
    this.speciesValue = value;
    this.syncBreedWithSpecies();
  }

  protected canCreateBreed(): boolean {
    const species = this.speciesValue.trim();
    const breed = this.breedValue.trim();
    return species.length > 0 && breed.length > 0 && !this.catalog.hasBreed(species, breed);
  }

  protected createBreed(): void {
    if (!this.canCreateBreed()) {
      return;
    }

    const canonicalSpecies = this.catalog.addSpecies(this.speciesValue);
    this.speciesValue = canonicalSpecies;
    this.breedValue = this.catalog.addBreed(canonicalSpecies, this.breedValue);
  }

  protected onBreedChanged(value: string): void {
    this.breedValue = value;
  }

  protected selectBreed(value: string): void {
    this.breedValue = value;
  }

  protected canCreateColor(): boolean {
    const value = this.colorValue.trim();
    return value.length > 0 && !this.catalog.hasColor(value);
  }

  protected createColor(): void {
    this.colorValue = this.catalog.addColor(this.colorValue);
  }

  protected onColorChanged(value: string): void {
    this.colorValue = value;
  }

  protected selectColor(value: string): void {
    this.colorValue = value;
  }

  private syncBreedWithSpecies(): void {
    const species = this.speciesValue.trim();

    if (!species) {
      this.breedValue = '';
      return;
    }

    if (this.breedValue && !this.catalog.hasBreed(species, this.breedValue)) {
      this.breedValue = '';
    }
  }
}
