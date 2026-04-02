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
import { AppointmentRecord, buildAppointmentReasonLabel, buildAppointmentStatusLabel } from '../models/appointment.model';

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

  protected close(): void {
    if (this.isSaving) return;
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

  protected buildReasonLabel(reason: string | null): string {
    return buildAppointmentReasonLabel(reason);
  }

  protected buildStatusLabel(status: string): string {
    return buildAppointmentStatusLabel(status as any);
  }

  protected get initals(): string {
    const name = this.appointment.patientName?.trim() || '';
    if (!name) return `P${String(this.appointment.patientId).slice(-1)}`;
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) ?? '';
    const second = parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '';
    return `${first}${second}`.toUpperCase() || `P${String(this.appointment.patientId).slice(-1)}`;
  }

  protected async confirmAppointment(): Promise<void> {
    if (this.isSaving) return;
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
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  protected async cancelAppointment(): Promise<void> {
    if (this.isSaving) return;
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
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  protected async registerArrival(): Promise<void> {
    if (this.isSaving) return;

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
        defaultMessage: 'No se pudo registrar la llegada en la cola de atención.',
      });
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  protected async markNoShow(): Promise<void> {
    if (this.isSaving) return;

    this.isSaving = true;
    this.submitError = null;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.appointmentsApi.markNoShow(this.appointment.id));
      this.updated.emit();
      this.close();
    } catch (error) {
      this.submitError = resolveApiErrorMessage(error, {
        defaultMessage: 'No se pudo marcar la cita como no asistió.',
      });
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
