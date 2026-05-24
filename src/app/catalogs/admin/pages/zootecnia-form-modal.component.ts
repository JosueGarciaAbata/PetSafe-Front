import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  ZootecniaCatalogKind,
  ZootecnicalGroupFormPayload,
  SpeciesFormPayload,
  BreedFormPayload,
  ZootecnicalGroupItem,
  SpeciesItem,
  BreedItem,
} from '../models/zootecnia-catalog.model';

export type ZootecniaFormPayload = ZootecnicalGroupFormPayload | SpeciesFormPayload | BreedFormPayload;

@Component({
  selector: 'app-zootecnia-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './zootecnia-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZootecniaFormModalComponent implements OnChanges {
  @Input() open = false;
  @Input() catalogKind: ZootecniaCatalogKind = 'ZOOTECNICAL_GROUP';
  @Input() item: ZootecnicalGroupItem | SpeciesItem | BreedItem | null = null;
  @Input() isSaving = false;
  @Input() errorMessage: string | null = null;

  /** Opciones para el select de grupo zootécnico (usado por SPECIES). */
  @Input() zootecnicalGroupOptions: ZootecnicalGroupItem[] = [];

  /** Opciones para el select de especie (usado por BREED). */
  @Input() speciesOptions: SpeciesItem[] = [];

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<ZootecniaFormPayload>();

  protected name = '';
  protected description = '';
  protected zootecnicalGroupId: number | null = null;
  protected speciesId: number | null = null;
  protected zootecnicalGroupSearchText = '';
  protected speciesSearchText = '';
  protected showValidationErrors = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['open']?.currentValue === true && changes['open']?.previousValue !== true)
      || changes['item']
      || changes['catalogKind']
      || changes['zootecnicalGroupOptions']
      || changes['speciesOptions']
    ) {
      this.resetForm();
    }
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.open && !this.isSaving) {
      this.close();
    }
  }

  protected close(): void {
    if (this.isSaving) {
      return;
    }
    this.closed.emit();
  }

  protected getFilteredZootecnicalGroups(): ZootecnicalGroupItem[] {
    const searchTerm = this.zootecnicalGroupSearchText.trim().toLocaleLowerCase();
    if (!searchTerm) {
      return this.zootecnicalGroupOptions;
    }
    return this.zootecnicalGroupOptions.filter((g) =>
      g.name.toLocaleLowerCase().includes(searchTerm)
    );
  }

  protected getFilteredSpecies(): SpeciesItem[] {
    const searchTerm = this.speciesSearchText.trim().toLocaleLowerCase();
    if (!searchTerm) {
      return this.speciesOptions;
    }
    return this.speciesOptions.filter((s) =>
      s.name.toLocaleLowerCase().includes(searchTerm)
    );
  }

  protected selectZootecnicalGroup(name: string): void {
    const matched = this.zootecnicalGroupOptions.find((g) => g.name === name);
    if (matched) {
      this.zootecnicalGroupId = matched.id;
      this.zootecnicalGroupSearchText = matched.name;
    }
  }

  protected selectSpeciesOption(name: string): void {
    const matched = this.speciesOptions.find((s) => s.name === name);
    if (matched) {
      this.speciesId = matched.id;
      this.speciesSearchText = matched.name;
    }
  }

  protected onZootecnicalGroupSearchChanged(value: string): void {
    this.zootecnicalGroupSearchText = value;
    const matched = this.zootecnicalGroupOptions.find(
      (g) => g.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase()
    );
    this.zootecnicalGroupId = matched ? matched.id : null;
  }

  protected onSpeciesSearchChanged(value: string): void {
    this.speciesSearchText = value;
    const matched = this.speciesOptions.find(
      (s) => s.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase()
    );
    this.speciesId = matched ? matched.id : null;
  }

  protected submit(): void {
    this.showValidationErrors = true;

    // Resolve IDs before submitting to cover custom typing
    if (this.catalogKind === 'SPECIES') {
      const matched = this.zootecnicalGroupOptions.find(
        (g) => g.name.toLocaleLowerCase() === this.zootecnicalGroupSearchText.trim().toLocaleLowerCase()
      );
      if (matched) {
        this.zootecnicalGroupId = matched.id;
      } else {
        this.zootecnicalGroupId = null;
      }
    }

    if (this.catalogKind === 'BREED') {
      const matched = this.speciesOptions.find(
        (s) => s.name.toLocaleLowerCase() === this.speciesSearchText.trim().toLocaleLowerCase()
      );
      if (matched) {
        this.speciesId = matched.id;
      } else {
        this.speciesId = null;
      }
    }

    const name = this.name.trim();
    if (!name) return;

    if (this.catalogKind === 'SPECIES' && !this.zootecnicalGroupId) return;
    if (this.catalogKind === 'BREED' && !this.speciesId) return;

    const base = {
      name,
      description: this.description.trim() || undefined,
    };

    if (this.catalogKind === 'SPECIES') {
      this.saved.emit({ ...base, zootecnicalGroupId: this.zootecnicalGroupId! } as SpeciesFormPayload);
    } else if (this.catalogKind === 'BREED') {
      this.saved.emit({ ...base, speciesId: this.speciesId! } as BreedFormPayload);
    } else {
      this.saved.emit(base as ZootecnicalGroupFormPayload);
    }
  }

  protected modalTitle(): string {
    switch (this.catalogKind) {
      case 'SPECIES':
        return this.item ? 'Editar especie' : 'Nueva especie';
      case 'BREED':
        return this.item ? 'Editar raza' : 'Nueva raza';
      default:
        return this.item ? 'Editar grupo zootécnico' : 'Nuevo grupo zootécnico';
    }
  }

  protected modalDescription(): string {
    switch (this.catalogKind) {
      case 'SPECIES':
        return this.item
          ? 'Actualiza la información de la especie.'
          : 'Registra una nueva especie dentro de un grupo zootécnico.';
      case 'BREED':
        return this.item
          ? 'Actualiza la información de la raza.'
          : 'Registra una nueva raza dentro de una especie.';
      default:
        return this.item
          ? 'Actualiza la información del grupo zootécnico.'
          : 'Registra un nuevo grupo zootécnico para clasificar especies.';
    }
  }

  protected hasNameError(): boolean {
    return this.showValidationErrors && !this.name.trim();
  }

  protected hasGroupError(): boolean {
    return this.showValidationErrors && this.catalogKind === 'SPECIES' && !this.zootecnicalGroupId;
  }

  protected hasSpeciesError(): boolean {
    return this.showValidationErrors && this.catalogKind === 'BREED' && !this.speciesId;
  }

  protected shouldShowGroupSelect(): boolean {
    return this.catalogKind === 'SPECIES';
  }

  protected shouldShowSpeciesSelect(): boolean {
    return this.catalogKind === 'BREED';
  }

  private resetForm(): void {
    this.showValidationErrors = false;
    this.name = this.item?.name ?? '';
    this.description = this.item?.description ?? '';

    if (this.catalogKind === 'SPECIES' && this.item) {
      this.zootecnicalGroupId = (this.item as SpeciesItem).zootecnicalGroupId ?? null;
      const matched = this.zootecnicalGroupOptions.find((g) => g.id === this.zootecnicalGroupId);
      this.zootecnicalGroupSearchText = matched ? matched.name : '';
    } else {
      this.zootecnicalGroupId = null;
      this.zootecnicalGroupSearchText = '';
    }

    if (this.catalogKind === 'BREED' && this.item) {
      this.speciesId = (this.item as BreedItem).speciesId ?? null;
      const matched = this.speciesOptions.find((s) => s.id === this.speciesId);
      this.speciesSearchText = matched ? matched.name : '';
    } else {
      this.speciesId = null;
      this.speciesSearchText = '';
    }
  }
}
