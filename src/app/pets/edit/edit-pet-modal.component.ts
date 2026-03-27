import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PetBasicDetailApiResponse } from '../models/pet-detail.model';

type EditPetGender = 'Macho' | 'Hembra';
type EditPetSterilized = 'Si' | 'No';

@Component({
  selector: 'app-edit-pet-modal',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './edit-pet-modal.component.html',
  styleUrl: './edit-pet-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPetModalComponent {
  private _pet!: PetBasicDetailApiResponse;

  protected name = '';
  protected speciesName = '';
  protected breedName = '';
  protected birthDate = '';
  protected weightKg = '';
  protected colorName = '';
  protected editGender: EditPetGender = 'Macho';
  protected editSterilized: EditPetSterilized = 'No';

  @Input({ required: true })
  set pet(value: PetBasicDetailApiResponse) {
    this._pet = value;
    this.name = value.name ?? '';
    this.speciesName = value.species?.name ?? '';
    this.breedName = value.breed?.name ?? '';
    this.birthDate = value.birthDate?.slice(0, 10) ?? '';
    this.weightKg =
      value.currentWeight === null || value.currentWeight === undefined
        ? ''
        : String(value.currentWeight);
    this.colorName = value.color?.name ?? '';
    this.editGender =
      (value.sex ?? '').trim().toUpperCase() === 'HEMBRA' ? 'Hembra' : 'Macho';
    this.editSterilized = value.sterilized === true ? 'Si' : 'No';
  }

  get pet(): PetBasicDetailApiResponse {
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

  protected setGender(value: EditPetGender): void {
    this.editGender = value;
  }

  protected setSterilized(value: EditPetSterilized): void {
    this.editSterilized = value;
  }
}
