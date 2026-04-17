import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import { EMPTY_PAGINATION_META, PaginationMeta } from '@app/shared/pagination/pagination.model';
import { QueueApiService } from '../api/queue-api.service';
import { EncountersApiService } from '@app/encounters/api/encounters-api.service';
import {
  EMPTY_QUEUE_SUMMARY,
  QUEUE_STATUS_FILTERS,
  QueueEntryRecord,
  QueueEntryStatus,
  QueueEntryType,
  QueueListQuery,
  QueueStatusFilter,
  QueueSummary,
  buildQueueEntryTypeLabel,
  buildQueueStatusLabel,
  buildQueueTimingLabel,
  formatQueueTime,
} from '../models/queue.model';

@Component({
  selector: 'app-queue-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './queue-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueuePageComponent implements OnInit {
  private readonly queueApi = inject(QueueApiService);
  private readonly encountersApi = inject(EncountersApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageSize = 15;
  private requestVersion = 0;
  private pendingEntryIdToReveal: number | null = null;

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly statusFilters = QUEUE_STATUS_FILTERS;
  protected readonly todayLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  protected entries: readonly QueueEntryRecord[] = [];
  protected summary: QueueSummary = EMPTY_QUEUE_SUMMARY;
  protected paginationMeta: PaginationMeta = EMPTY_PAGINATION_META;
  protected isLoading = false;
  protected loadError: string | null = null;
  protected isDetailPanelOpen = false;
  protected isActionModalOpen = false;
  protected selectedEntryId: number | null = null;
  protected pendingActionEntry: QueueEntryRecord | null = null;
  protected pendingActionType: 'start' | 'cancel' | 'finish' | null = null;
  protected activeStatusFilter: QueueStatusFilter = 'TODOS';

  ngOnInit(): void {
    const state = history.state as { entryId?: number } | null;
    if (typeof state?.entryId === 'number') {
      this.pendingEntryIdToReveal = state.entryId;
      this.selectedEntryId = state.entryId;
      this.isDetailPanelOpen = true;
    }

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.loadQueue(1);
      });

    void this.loadQueue(1);
  }

  protected get selectedEntry(): QueueEntryRecord | null {
    if (this.selectedEntryId === null) {
      return this.entries[0] ?? null;
    }

    return this.entries.find((entry) => entry.id === this.selectedEntryId) ?? this.entries[0] ?? null;
  }

  protected get totalVisibleEntries(): number {
    return this.entries.length;
  }

  protected get hasActiveFilters(): boolean {
    return this.searchControl.value.trim().length > 0 || this.activeStatusFilter !== 'EN_ESPERA';
  }

  protected get selectedStatusFilterLabel(): string {
    return (
      this.statusFilters.find((filter) => filter.value === this.activeStatusFilter)?.label ??
      'En espera'
    );
  }

  protected selectStatusFilter(status: QueueStatusFilter): void {
    if (this.activeStatusFilter === status) {
      return;
    }

    this.activeStatusFilter = status;
    void this.loadQueue(1);
  }

  protected onPageChange(page: number): void {
    void this.loadQueue(page);
  }

  protected openIntakePage(): void {
    void this.router.navigate(['/queue/new'], { state: { returnTo: '/queue' } });
  }

  protected retryLoadQueue(): void {
    void this.loadQueue(this.paginationMeta.currentPage);
  }

  protected clearFilters(): void {
    if (!this.hasActiveFilters) {
      return;
    }

    this.searchControl.setValue('', { emitEvent: false });
    this.activeStatusFilter = 'TODOS';
    void this.loadQueue(1);
  }

  protected selectEntry(entry: QueueEntryRecord): void {
    this.selectedEntryId = entry.id;
    this.isDetailPanelOpen = true;
  }

  protected openDetailPanel(): void {
    this.isDetailPanelOpen = true;
  }

  protected closeDetailPanel(): void {
    this.isDetailPanelOpen = false;
    this.closeActionModal();
  }

  protected viewEncounter(entry: QueueEntryRecord): void {
    if (entry.encounter) {
      this.closeDetailPanel();
      void this.router.navigate(['/encounters', entry.encounter.id]);
    }
  }

  protected buildPatientSubtitle(entry: QueueEntryRecord): string {
    const species = entry.patient.species?.trim();
    const breed = entry.patient.breed?.trim();
    const parts = [species, breed].filter((value): value is string => Boolean(value));

    if (parts.length === 0) {
      return 'Sin especie registrada';
    }

    return parts.join(' | ');
  }

  protected buildArrivalLabel(entry: QueueEntryRecord): string {
    return formatQueueTime(entry.arrivalTime);
  }

  protected buildScheduledLabel(entry: QueueEntryRecord): string {
    return formatQueueTime(entry.scheduledTime);
  }

  protected buildStatusLabel(status: QueueEntryStatus): string {
    return buildQueueStatusLabel(status);
  }

  protected buildStatusValueClass(status: QueueEntryStatus): string {
    switch (status) {
      case 'EN_ESPERA':
        return 'text-[#365E9D]';
      case 'EN_ATENCION':
        return 'text-brand';
      case 'FINALIZADA':
        return 'text-text-secondary';
      case 'CANCELADA':
        return 'text-[#A35454]';
    }
  }

  protected buildNotesPreview(entry: QueueEntryRecord): string {
    const notes = entry.notes?.trim();
    return notes || 'Sin motivo registrado';
  }

  protected buildEntryTypeLabel(entry: QueueEntryRecord): string {
    return buildQueueEntryTypeLabel(entry.entryType);
  }

  protected buildTimingLabel(entry: QueueEntryRecord): string {
    return buildQueueTimingLabel(entry);
  }

  protected buildQueueStatusHelpText(entry: QueueEntryRecord): string {
    const entryLabel = buildQueueEntryTypeLabel(entry.entryType).toLowerCase();

    switch (entry.queueStatus) {
      case 'EN_ESPERA':
        return `Ingreso ${entryLabel}. Pendiente de ser atendido.`;
      case 'EN_ATENCION':
        return `Ingreso ${entryLabel}. El paciente ya se encuentra en atencion.`;
      case 'FINALIZADA':
        return `Ingreso ${entryLabel}. La atencion ya fue finalizada.`;
      case 'CANCELADA':
        return `Ingreso ${entryLabel}. El ingreso fue cancelado.`;
    }
  }

  protected canReactivateEncounter(entry: QueueEntryRecord): boolean {
    if (entry.queueStatus !== 'FINALIZADA' || !entry.encounter?.canReactivate) {
      return false;
    }

    if (!entry.encounter.reactivationGraceEndsAt) {
      return false;
    }

    return new Date(entry.encounter.reactivationGraceEndsAt).getTime() >= Date.now();
  }

  protected buildEncounterHelpText(entry: QueueEntryRecord): string {
    if (!entry.encounter) {
      return 'Esta entrada no tiene una consulta clínica vinculada en este momento.';
    }

    if (this.canReactivateEncounter(entry) && entry.encounter.reactivationGraceEndsAt) {
      return `La consulta clínica puede reactivarse hasta ${this.formatDateTime(entry.encounter.reactivationGraceEndsAt)}.`;
    }

    switch (entry.encounter.status) {
      case 'ACTIVA':
        return 'La consulta clínica está actualmente abierta.';
      case 'REACTIVADA':
        return 'La consulta clínica fue reactivada y sigue editable.';
      case 'FINALIZADA':
        return 'La consulta clínica vinculada ya fue cerrada y su ventana de reactivación terminó.';
      case 'ANULADA':
        return 'La consulta clínica vinculada fue anulada y no puede retomarse.';
      default:
        return 'La consulta clínica vinculada no tiene acciones adicionales disponibles.';
    }
  }

  protected buildEntryTypeClass(entryType: QueueEntryType): string {
    switch (entryType) {
      case 'CON_CITA':
        return 'bg-[#E0F3FF] text-[#005299] border border-[#B8E2FF]';
      case 'SIN_CITA':
        return 'bg-[#FFF4E0] text-[#995700] border border-[#FFDDAA]';
      case 'EMERGENCIA':
        return 'bg-[#FFE0E0] text-[#990000] border border-[#FFB8B8]';
    }
  }

  protected buildStatusClass(status: QueueEntryStatus): string {
    switch (status) {
      case 'EN_ESPERA':
        return 'border border-dashed border-border bg-background text-text-secondary';
      case 'EN_ATENCION':
        return 'bg-[#E5F5E0] text-[#1D7A04] border border-[#BDE8B4]';
      case 'FINALIZADA':
        return 'bg-[#E8F7F1] text-[#1F7A5A] border border-[#BFE7D6]';
      case 'CANCELADA':
        return 'bg-[#FFE0E0] text-[#990000] border border-[#FFB8B8]';
    }
  }

  protected getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const firstInitial = parts[0]?.charAt(0) ?? '';
    const secondInitial = parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '';
    return `${firstInitial}${secondInitial}`.trim().toUpperCase() || 'Q';
  }

  protected patientImageUrl(entry: QueueEntryRecord): string | null {
    return entry.patient.image?.url ?? null;
  }

  protected patientImageAlt(entry: QueueEntryRecord): string {
    return `Foto de ${entry.patient.name}`;
  }

  protected formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }

  protected isSelected(entry: QueueEntryRecord): boolean {
    return this.selectedEntryId === entry.id;
  }

  protected isEmergency(entry: QueueEntryRecord): boolean {
    return entry.entryType === 'EMERGENCIA';
  }

  protected async startAttention(entry: QueueEntryRecord): Promise<void> {
    if (entry.queueStatus === 'FINALIZADA' || entry.queueStatus === 'CANCELADA') {
      return;
    }

    this.loadError = null;
    this.cdr.detectChanges();

    const encounterPayload = {
      queueEntryId: entry.id,
      generalNotes: entry.notes ?? undefined,
    };

    let queueWasStarted = false;

    try {
      if (entry.queueStatus === 'EN_ATENCION') {
        const encounter = await firstValueFrom(this.encountersApi.create(encounterPayload));
        void this.router.navigate(['/encounters', encounter.id]);
        return;
      }

      await firstValueFrom(this.queueApi.startAttention(entry.id));
      queueWasStarted = true;
      const encounter = await firstValueFrom(this.encountersApi.create(encounterPayload));
      void this.router.navigate(['/encounters', encounter.id]);
    } catch (error) {
      if (queueWasStarted || entry.queueStatus === 'EN_ATENCION') {
        this.pendingEntryIdToReveal = entry.id;
        this.activeStatusFilter = 'TODOS';
        await this.loadQueue(this.paginationMeta.currentPage || 1);
      }

      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo iniciar la consulta médica para este paciente.',
      });
      this.cdr.detectChanges();
    }
  }

  protected async finishAttention(entry: QueueEntryRecord): Promise<void> {
    if (entry.queueStatus !== 'EN_ATENCION') {
      return;
    }

    try {
      if (entry.encounter) {
        await firstValueFrom(this.encountersApi.finish(entry.encounter.id));
      } else {
        await firstValueFrom(this.queueApi.finishAttention(entry.id));
      }
      
      await this.loadQueue(this.paginationMeta.currentPage);
      this.selectedEntryId = entry.id;
    } catch (error) {
      if (entry.encounter) {
        this.closeActionModal();
        this.closeDetailPanel();
        
        const errorMessage = resolveApiErrorMessage(error, {
          defaultMessage: 'No se pudo finalizar la atención desde la cola operativa. Por favor, revisa y completa los registros médicos requeridos aquí.',
        });
        
        void this.router.navigate(['/encounters', entry.encounter.id], {
          state: {
            autoFinishActionError: errorMessage,
          },
        });
        return;
      }

      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo finalizar la atención de este paciente.',
      });
      this.cdr.detectChanges();
    }
  }

  protected async reactivateEncounter(entry: QueueEntryRecord): Promise<void> {
    if (!entry.encounter || !this.canReactivateEncounter(entry)) {
      return;
    }

    this.loadError = null;
    this.cdr.detectChanges();

    try {
      const encounter = await firstValueFrom(this.encountersApi.reactivate(entry.encounter.id));
      this.closeDetailPanel();
      void this.router.navigate(['/encounters', encounter.id]);
    } catch (error) {
      this.pendingEntryIdToReveal = entry.id;
      this.activeStatusFilter = 'TODOS';
      await this.loadQueue(this.paginationMeta.currentPage || 1);
      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo reactivar la consulta clínica desde atención diaria.',
      });
      this.cdr.detectChanges();
    }
  }

  protected openStartModal(entry: QueueEntryRecord): void {
    if (entry.queueStatus === 'FINALIZADA' || entry.queueStatus === 'CANCELADA') {
      return;
    }

    this.pendingActionEntry = entry;
    this.pendingActionType = 'start';
    this.isActionModalOpen = true;
  }

  protected openCancelModal(entry: QueueEntryRecord): void {
    if (entry.queueStatus !== 'EN_ESPERA') {
      return;
    }

    this.pendingActionEntry = entry;
    this.pendingActionType = 'cancel';
    this.isActionModalOpen = true;
  }

  protected openFinishModal(entry: QueueEntryRecord): void {
    if (entry.queueStatus !== 'EN_ATENCION') {
      return;
    }

    this.pendingActionEntry = entry;
    this.pendingActionType = 'finish';
    this.isActionModalOpen = true;
  }

  protected closeActionModal(): void {
    this.isActionModalOpen = false;
    this.pendingActionEntry = null;
    this.pendingActionType = null;
  }

  protected buildActionModalTitle(): string {
    switch (this.pendingActionType) {
      case 'start':
        return 'Confirmar inicio de atencion';
      case 'cancel':
        return 'Confirmar cancelacion';
      case 'finish':
        return 'Confirmar finalizacion';
      default:
        return 'Confirmar accion';
    }
  }

  protected buildActionModalDescription(): string {
    switch (this.pendingActionType) {
      case 'start':
        return 'Se abrira la consulta para este paciente y se cambiara su estado operativo.';
      case 'cancel':
        return 'El paciente quedara fuera de la cola operativa.';
      case 'finish':
        return 'La atencion se marcara como finalizada para este paciente.';
      default:
        return '';
    }
  }

  protected buildActionModalConfirmLabel(): string {
    switch (this.pendingActionType) {
      case 'start':
        return 'Si, iniciar atencion';
      case 'cancel':
        return 'Si, cancelar';
      case 'finish':
        return 'Si, finalizar';
      default:
        return 'Confirmar';
    }
  }

  protected isDestructiveAction(): boolean {
    return this.pendingActionType === 'cancel';
  }

  protected async confirmPendingAction(): Promise<void> {
    const entry = this.pendingActionEntry;
    const pendingActionType = this.pendingActionType;

    if (!entry || !pendingActionType) {
      this.closeActionModal();
      return;
    }

    try {
      this.closeActionModal();

      if (pendingActionType === 'start') {
        await this.startAttention(entry);
        return;
      }

      if (pendingActionType === 'finish') {
        await this.finishAttention(entry);
      } else if (pendingActionType === 'cancel') {
        await firstValueFrom(this.queueApi.cancelEntry(entry.id));
        await this.loadQueue(this.paginationMeta.currentPage);
        this.selectedEntryId = entry.id;
      }
    } catch (error) {
      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage:
          pendingActionType === 'finish'
            ? 'No se pudo finalizar la atenciA3n de este paciente.'
            : 'No se pudo cancelar el ingreso de este paciente.',
      });
      this.cdr.detectChanges();
    }
  }

  private async loadQueue(page: number): Promise<void> {
    const requestToken = ++this.requestVersion;
    const query: QueueListQuery = {
      page,
      limit: this.pageSize,
      searchTerm: this.searchControl.value.trim() || undefined,
      status: this.activeStatusFilter,
    };

    this.isLoading = true;
    this.loadError = null;
    this.entries = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(this.queueApi.list(query));

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.entries = response.data;
      this.summary = response.summary;
      this.paginationMeta = response.meta;

      if (this.entries.length === 0) {
        this.selectedEntryId = null;
        this.isDetailPanelOpen = false;
        this.pendingEntryIdToReveal = null;
      } else {
        const revealEntryId = this.pendingEntryIdToReveal ?? this.selectedEntryId;
        const selectedVisibleEntry = this.entries.find((entry) => entry.id === revealEntryId);

        if (this.pendingEntryIdToReveal !== null && selectedVisibleEntry) {
          this.selectedEntryId = selectedVisibleEntry.id;
          this.isDetailPanelOpen = true;
          this.pendingEntryIdToReveal = null;
        } else if (!selectedVisibleEntry) {
          this.selectedEntryId = null;
          this.isDetailPanelOpen = false;
        }
      }
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudo cargar la cola de atención.';
      this.entries = [];
      this.summary = EMPTY_QUEUE_SUMMARY;
      this.paginationMeta = EMPTY_PAGINATION_META;
      this.selectedEntryId = null;
      this.isDetailPanelOpen = false;
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
