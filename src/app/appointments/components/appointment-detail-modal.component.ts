import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppointmentsApiService } from '../api/appointments-api.service';
import { QueueApiService } from '@app/queue/api/queue-api.service';
import {
  AppointmentRecord,
  AppointmentStatus,
  buildAppointmentReasonLabel,
  buildAppointmentStatusLabel,
} from '../models/appointment.model';
import { parseDateKey } from '../utils/appointment-date.util';

type AppointmentAction = 'confirm' | 'cancel' | 'arrival' | 'noShow' | null;

@Component({
  selector: 'app-appointment-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment-detail-modal.component.html',
  styleUrl: './appointment-detail-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentDetailModalComponent {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly queueApi = inject(QueueApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) appointment!: AppointmentRecord;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly updated = new EventEmitter<void>();

  protected isSaving = false;
  protected submitError: string | null = null;
  protected activeAction: AppointmentAction = null;

  protected close(): void {
    if (this.isSaving) {
      return;
    }

    this.closed.emit();
  }

  protected get canConfirm(): boolean {
    return this.appointment.status === 'PROGRAMADA';
  }

  protected get canCancel(): boolean {
    return !['FINALIZADA', 'CANCELADA', 'EN_PROCESO', 'NO_ASISTIO'].includes(this.appointment.status);
  }

  protected get canRegisterArrival(): boolean {
    return (
      ['PROGRAMADA', 'CONFIRMADA'].includes(this.appointment.status) &&
      this.appointment.scheduledDate === this.buildTodayDateKey()
    );
  }

  protected get canMarkNoShow(): boolean {
    if (!['PROGRAMADA', 'CONFIRMADA'].includes(this.appointment.status)) {
      return false;
    }

    const now = new Date();
    const appointmentEnd = new Date(
      `${this.appointment.scheduledDate}T${this.appointment.endsAt ?? this.appointment.startsAt}`,
    );

    return !Number.isNaN(appointmentEnd.getTime()) && appointmentEnd <= now;
  }

  protected get registerArrivalIsPrimary(): boolean {
    return this.canRegisterArrival && !this.canConfirm;
  }

  protected get hasActions(): boolean {
    return this.canConfirm || this.canRegisterArrival || this.canCancel || this.canMarkNoShow;
  }

  protected get patientNameLabel(): string {
    return this.appointment.patientName?.trim() || `Paciente #${this.appointment.patientId}`;
  }

  protected get ownerNameLabel(): string {
    return this.appointment.ownerName?.trim() || 'Tutor no registrado';
  }

  protected get initials(): string {
    const name = this.appointment.patientName?.trim() || '';

    if (!name) {
      return `P${String(this.appointment.patientId).slice(-1)}`;
    }

    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) ?? '';
    const second = parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '';
    return `${first}${second}`.toUpperCase() || `P${String(this.appointment.patientId).slice(-1)}`;
  }

  protected buildReasonLabel(reason: string | null): string {
    return buildAppointmentReasonLabel(reason);
  }

  protected buildStatusLabel(status: AppointmentStatus): string {
    return buildAppointmentStatusLabel(status);
  }

  protected buildStatusClasses(status: AppointmentStatus): string {
    switch (status) {
      case 'PROGRAMADA':
        return 'appointment-detail-status appointment-detail-status--scheduled';
      case 'CONFIRMADA':
        return 'appointment-detail-status appointment-detail-status--confirmed';
      case 'EN_PROCESO':
        return 'appointment-detail-status appointment-detail-status--in-process';
      case 'FINALIZADA':
        return 'appointment-detail-status appointment-detail-status--finished';
      case 'CANCELADA':
        return 'appointment-detail-status appointment-detail-status--cancelled';
      case 'NO_ASISTIO':
        return 'appointment-detail-status appointment-detail-status--no-show';
    }
  }

  protected buildDateLabel(dateKey: string): string {
    const date = parseDateKey(dateKey);

    return new Intl.DateTimeFormat('es-EC', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  protected buildWeekdayLabel(dateKey: string): string {
    const date = parseDateKey(dateKey);

    return new Intl.DateTimeFormat('es-EC', {
      weekday: 'long',
    }).format(date);
  }

  protected buildTimeRangeLabel(): string {
    return this.appointment.endsAt
      ? `${this.appointment.startsAt} - ${this.appointment.endsAt}`
      : this.appointment.startsAt;
  }

  protected buildStatusHelpText(status: AppointmentStatus): string {
    switch (status) {
      case 'PROGRAMADA':
        return 'Pendiente de confirmacion.';
      case 'CONFIRMADA':
        return 'Lista para registrar llegada.';
      case 'EN_PROCESO':
        return 'Ya se encuentra en atencion.';
      case 'FINALIZADA':
        return 'La cita ya fue atendida.';
      case 'CANCELADA':
        return 'La cita fue cancelada.';
      case 'NO_ASISTIO':
        return 'Se registro que el paciente no asistio.';
    }
  }

  protected async confirmAppointment(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    this.activeAction = 'confirm';
    this.isSaving = true;
    this.submitError = null;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.appointmentsApi.confirm(this.appointment.id));
      this.updated.emit();
      this.close();
    } catch (error) {
      this.submitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo confirmar la cita.',
      });
      this.activeAction = null;
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  protected async cancelAppointment(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    this.activeAction = 'cancel';
    this.isSaving = true;
    this.submitError = null;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.appointmentsApi.cancel(this.appointment.id));
      this.updated.emit();
      this.close();
    } catch (error) {
      this.submitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo cancelar la cita.',
      });
      this.activeAction = null;
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  protected async registerArrival(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    this.activeAction = 'arrival';
    this.isSaving = true;
    this.submitError = null;
    this.cdr.markForCheck();

    try {
      const entry = await firstValueFrom(
        this.queueApi.createEntry({
          patientId: this.appointment.patientId,
          appointmentId: this.appointment.id,
          entryType: 'CON_CITA',
          scheduledTime: this.appointment.startsAt,
          notes: this.appointment.notes,
        }),
      );

      this.updated.emit();
      this.close();
      await this.router.navigate(['/queue'], { state: { entryId: entry.id } });
    } catch (error) {
      this.submitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo registrar la llegada en la cola de atencion.',
      });
      this.activeAction = null;
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  protected async markNoShow(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    this.activeAction = 'noShow';
    this.isSaving = true;
    this.submitError = null;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.appointmentsApi.markNoShow(this.appointment.id));
      this.updated.emit();
      this.close();
    } catch (error) {
      this.submitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo marcar la cita como no asistio.',
      });
      this.activeAction = null;
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private buildTodayDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
