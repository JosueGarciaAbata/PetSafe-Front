import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import {
  QueueEntryRecord,
  QueueEntryStatus,
  QueueEntryType,
  buildQueueEntryTypeLabel,
  buildQueueStatusLabel,
  formatQueueTime,
} from '../models/queue.model';

@Component({
  selector: 'app-queue-entry-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './queue-entry-detail-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueEntryDetailModalComponent {
  @Input() open = false;
  @Input() entry: QueueEntryRecord | null = null;
  @Input() allowQueueStateActions = true;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly startRequested = new EventEmitter<QueueEntryRecord>();
  @Output() readonly cancelRequested = new EventEmitter<QueueEntryRecord>();
  @Output() readonly finishRequested = new EventEmitter<QueueEntryRecord>();
  @Output() readonly reactivateRequested = new EventEmitter<QueueEntryRecord>();
  @Output() readonly viewEncounterRequested = new EventEmitter<QueueEntryRecord>();

  protected emitClosed(): void {
    this.closed.emit();
  }

  protected requestStart(entry: QueueEntryRecord): void {
    this.startRequested.emit(entry);
  }

  protected requestCancel(entry: QueueEntryRecord): void {
    this.cancelRequested.emit(entry);
  }

  protected requestFinish(entry: QueueEntryRecord): void {
    this.finishRequested.emit(entry);
  }

  protected requestReactivate(entry: QueueEntryRecord): void {
    this.reactivateRequested.emit(entry);
  }

  protected requestViewEncounter(entry: QueueEntryRecord): void {
    this.viewEncounterRequested.emit(entry);
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

  protected buildEntryTypeLabel(entry: QueueEntryRecord): string {
    return buildQueueEntryTypeLabel(entry.entryType);
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
}
