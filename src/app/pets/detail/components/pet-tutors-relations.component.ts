import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { OwnersApiService } from '@app/owners/api/owners-api.service';
import { ClientTutorBasicApiResponse } from '@app/owners/models/client-tutor-basic.model';
import {
  PetBasicDetailApiResponse,
  PetTutorApiResponse,
} from '../../models/pet-detail.model';
import { PetsApiService } from '../../services/pets-api.service';

@Component({
  selector: 'app-pet-tutors-relations',
  standalone: true,
  imports: [FormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  templateUrl: './pet-tutors-relations.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetTutorsRelationsComponent {
  private readonly petsApi = inject(PetsApiService);
  private readonly ownersApi = inject(OwnersApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private tutorLookupVersion = 0;
  private tutorSearchTimer?: ReturnType<typeof setTimeout>;
  private isSelectingTutor = false;

  @Input({ required: true }) pet: PetBasicDetailApiResponse | null = null;

  protected tutorsLookup: ClientTutorBasicApiResponse[] = [];
  protected tutorLookupValue = '';
  protected selectedTutorToAdd: ClientTutorBasicApiResponse | null = null;
  protected isTutorLookupLoading = false;
  protected isTutorModalOpen = false;
  protected tutorPendingRemoval: PetTutorApiResponse | null = null;
  protected newTutorAsPrimary = false;
  protected tutorActionError: string | null = null;
  protected isTutorActionRunning = false;

  protected petTutors(): PetTutorApiResponse[] { return this.pet?.tutors ?? []; }
  protected hasMultipleTutors(): boolean { return this.petTutors().length > 1; }
  protected tutorOptions(): ClientTutorBasicApiResponse[] { return this.tutorsLookup; }
  protected buildTutorLookupLabel(option: ClientTutorBasicApiResponse): string { return `${option.firstName} ${option.lastName}`.trim(); }
  protected buildTutorLookupPhone(option: ClientTutorBasicApiResponse): string { return option.phone?.trim() || 'Sin telefono registrado'; }
  protected buildTutorDocumentLabel(tutor: PetTutorApiResponse): string { const documentId = tutor.documentId?.trim(); return documentId ? `CI ${documentId}` : 'Sin cédula registrada'; }
  protected buildTutorPhoneLabel(tutor: PetTutorApiResponse): string { return tutor.phone?.trim() || 'Sin teléfono registrado'; }
  protected buildTutorRelationshipLabel(tutor: PetTutorApiResponse): string { return tutor.relationship?.trim() || 'Responsable'; }
  protected canAddSelectedTutor(): boolean { return this.selectedTutorToAdd !== null && !this.isTutorActionRunning; }
  protected canRemoveTutor(): boolean { return this.hasMultipleTutors() && !this.isTutorActionRunning; }

  protected openTutorEditor(): void {
    this.isTutorModalOpen = true;
    this.tutorActionError = null;
    this.tutorLookupValue = '';
    this.selectedTutorToAdd = null;
    this.newTutorAsPrimary = false;
    this.clearTutorSearchTimer();
    void this.loadTutorOptions('');
  }

  protected closeTutorEditor(force = false): void {
    if (this.isTutorActionRunning && !force) return;
    this.isTutorModalOpen = false;
    this.tutorPendingRemoval = null;
    this.tutorActionError = null;
    this.tutorLookupValue = '';
    this.selectedTutorToAdd = null;
    this.newTutorAsPrimary = false;
    this.clearTutorSearchTimer();
    this.cdr.detectChanges();
  }

  protected onTutorLookupChanged(value: string): void {
    this.tutorLookupValue = value;
    this.tutorActionError = null;
    const matchedTutor = this.tutorOptions().find((option) => this.buildTutorLookupLabel(option) === value.trim()) ?? null;
    if (this.isSelectingTutor) { this.isSelectingTutor = false; return; }
    this.selectedTutorToAdd = matchedTutor;
    if (matchedTutor) { this.clearTutorSearchTimer(); return; }
    this.scheduleTutorSearch();
  }

  protected onTutorLookupSelection(isUserInput: boolean, option: ClientTutorBasicApiResponse): void {
    if (!isUserInput) return;
    this.isSelectingTutor = true;
    this.clearTutorSearchTimer();
    this.selectedTutorToAdd = option;
    this.tutorLookupValue = this.buildTutorLookupLabel(option);
  }

  protected async addTutor(): Promise<void> {
    if (!this.pet || !this.selectedTutorToAdd || this.isTutorActionRunning) return;
    this.isTutorActionRunning = true;
    this.tutorActionError = null;
    this.cdr.detectChanges();
    try {
      this.pet = await firstValueFrom(this.petsApi.addTutor(this.pet.id, {
        clientId: this.selectedTutorToAdd.id,
        isPrimary: this.newTutorAsPrimary || undefined,
      }));
      this.closeTutorEditor(true);
    } catch (error: unknown) {
      this.tutorActionError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo agregar el tutor.',
        clientErrorMessage: 'Revisa el tutor seleccionado.',
      });
    } finally {
      this.isTutorActionRunning = false;
      this.cdr.detectChanges();
    }
  }

  protected async markTutorAsPrimary(tutor: PetTutorApiResponse): Promise<void> {
    if (!this.pet || tutor.isPrimary || this.isTutorActionRunning) return;
    this.isTutorActionRunning = true;
    this.tutorActionError = null;
    this.cdr.detectChanges();
    try {
      this.pet = await firstValueFrom(this.petsApi.setPrimaryTutor(this.pet.id, tutor.clientId));
    } catch (error: unknown) {
      this.tutorActionError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo actualizar el tutor principal.',
        clientErrorMessage: 'No se pudo cambiar el tutor principal.',
      });
    } finally {
      this.isTutorActionRunning = false;
      this.cdr.detectChanges();
    }
  }

  protected removeTutor(tutor: PetTutorApiResponse): void {
    if (!this.pet || this.isTutorActionRunning || !this.canRemoveTutor()) return;
    this.tutorPendingRemoval = tutor;
    this.cdr.detectChanges();
  }

  protected closeTutorRemovalModal(): void {
    if (this.isTutorActionRunning) return;
    this.tutorPendingRemoval = null;
    this.cdr.detectChanges();
  }

  protected async confirmTutorRemoval(): Promise<void> {
    if (!this.pet || !this.tutorPendingRemoval || this.isTutorActionRunning || !this.canRemoveTutor()) return;
    const tutor = this.tutorPendingRemoval;
    this.isTutorActionRunning = true;
    this.tutorActionError = null;
    this.cdr.detectChanges();
    try {
      this.pet = await firstValueFrom(this.petsApi.removeTutor(this.pet.id, tutor.clientId));
      this.tutorPendingRemoval = null;
    } catch (error: unknown) {
      this.tutorActionError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo quitar el tutor.',
        clientErrorMessage: 'No se pudo quitar el tutor.',
      });
    } finally {
      this.isTutorActionRunning = false;
      this.cdr.detectChanges();
    }
  }

  private scheduleTutorSearch(): void {
    this.clearTutorSearchTimer();
    this.tutorSearchTimer = setTimeout(() => void this.loadTutorOptions(this.tutorLookupValue), 300);
  }

  private clearTutorSearchTimer(): void {
    if (this.tutorSearchTimer === undefined) return;
    clearTimeout(this.tutorSearchTimer);
    this.tutorSearchTimer = undefined;
  }

  private async loadTutorOptions(search: string): Promise<void> {
    const requestToken = ++this.tutorLookupVersion;
    this.isTutorLookupLoading = true;
    this.tutorsLookup = [];
    this.cdr.detectChanges();
    try {
      const response = await firstValueFrom(this.ownersApi.listBasicTutors({
        page: 1,
        limit: 10,
        search: search.trim() || undefined,
      }));
      if (requestToken !== this.tutorLookupVersion) return;
      const currentTutorIds = new Set(this.petTutors().map((tutor) => tutor.clientId));
      this.tutorsLookup = response.filter((option) => !currentTutorIds.has(option.id));
    } catch {
      if (requestToken !== this.tutorLookupVersion) return;
      this.tutorsLookup = [];
    } finally {
      if (requestToken !== this.tutorLookupVersion) return;
      this.isTutorLookupLoading = false;
      this.cdr.detectChanges();
    }
  }
}
