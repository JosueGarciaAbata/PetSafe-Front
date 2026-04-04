import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppointmentsApiService } from '../api/appointments-api.service';
import { AppointmentMonthCalendarComponent } from '../components/appointment-month-calendar.component';
import { CreateAppointmentModalComponent } from '../components/create-appointment-modal.component';
import { AppointmentWeekCalendarComponent } from '../components/appointment-week-calendar.component';
import { AppointmentDetailModalComponent } from '../components/appointment-detail-modal.component';
import {
  AppointmentCalendarQuery,
  AppointmentCalendarMonthResponse,
  AppointmentCalendarSummary,
  AppointmentCalendarView,
  AppointmentCalendarWeekResponse,
  AppointmentMonthCell,
  AppointmentWeekDay,
  EMPTY_APPOINTMENT_SUMMARY,
} from '../models/appointment-calendar.model';
import { AppointmentRecord } from '../models/appointment.model';
import {
  buildAppointmentMonthCells,
  buildAppointmentSummary,
  buildAppointmentWeekDays,
} from '../utils/appointment-calendar.mapper';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  formatDateKey,
  buildMonthLabel,
  parseDateKey,
  startOfMonth,
  startOfWeek,
  buildWeekRangeLabel,
  buildWeekdayLabels,
  getTodayDateKey,
} from '../utils/appointment-date.util';

@Component({
  selector: 'app-appointments-page',
  standalone: true,
  imports: [
    CommonModule,
    AppointmentMonthCalendarComponent,
    AppointmentWeekCalendarComponent,
    CreateAppointmentModalComponent,
    AppointmentDetailModalComponent,
  ],
  templateUrl: './appointments-page.component.html',
  styleUrl: './appointments-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentsPageComponent implements OnInit {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private requestVersion = 0;

  protected currentView: AppointmentCalendarView = 'month';
  protected readonly weekdayLabels = buildWeekdayLabels();
  protected activeDate = getTodayDateKey();
  protected currentRangeLabel = buildMonthLabel(this.activeDate);
  protected monthCells: readonly AppointmentMonthCell[] = [];
  protected weekDays: readonly AppointmentWeekDay[] = [];
  protected summary: AppointmentCalendarSummary = EMPTY_APPOINTMENT_SUMMARY;
  protected isCreateAppointmentModalOpen = false;
  protected selectedAppointment: AppointmentRecord | null = null;
  protected isLoading = false;
  protected loadError: string | null = null;

  ngOnInit(): void {
    void this.loadAppointments();
  }

  protected openCreateAppointmentModal(): void {
    this.isCreateAppointmentModalOpen = true;
  }

  protected closeCreateAppointmentModal(): void {
    this.isCreateAppointmentModalOpen = false;
  }

  protected onCreateAppointmentSaved(): void {
    this.closeCreateAppointmentModal();
    void this.loadAppointments();
  }

  protected openAppointmentDetail(appointment: AppointmentRecord): void {
    this.selectedAppointment = appointment;
  }

  protected closeAppointmentDetail(): void {
    this.selectedAppointment = null;
  }

  protected onAppointmentDetailUpdated(): void {
    this.closeAppointmentDetail();
    void this.loadAppointments();
  }

  protected retryLoadAppointments(): void {
    void this.loadAppointments();
  }

  protected switchView(view: AppointmentCalendarView): void {
    if (view === this.currentView || view === 'day') {
      return;
    }

    this.currentView = view;
    void this.loadAppointments();
  }

  protected goToPreviousRange(): void {
    const currentDate = parseDateKey(this.activeDate);
    const nextDate =
      this.currentView === 'week' ? addDays(currentDate, -7) : addMonths(currentDate, -1);

    this.activeDate = formatDateKey(nextDate);
    void this.loadAppointments();
  }

  protected goToNextRange(): void {
    const currentDate = parseDateKey(this.activeDate);
    const nextDate =
      this.currentView === 'week' ? addDays(currentDate, 7) : addMonths(currentDate, 1);

    this.activeDate = formatDateKey(nextDate);
    void this.loadAppointments();
  }

  protected goToToday(): void {
    this.activeDate = getTodayDateKey();
    void this.loadAppointments();
  }

  protected isCurrentRangeActive(): boolean {
    const todayKey = getTodayDateKey();

    if (this.currentView === 'week') {
      return (
        formatDateKey(startOfWeek(this.activeDate)) === formatDateKey(startOfWeek(todayKey))
      );
    }

    const activeDate = parseDateKey(this.activeDate);
    const todayDate = parseDateKey(todayKey);
    return (
      activeDate.getFullYear() === todayDate.getFullYear()
      && activeDate.getMonth() === todayDate.getMonth()
    );
  }

  private async loadAppointments(): Promise<void> {
    const requestToken = ++this.requestVersion;
    const query = this.buildCalendarQuery();

    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    try {
      let response: AppointmentCalendarMonthResponse | AppointmentCalendarWeekResponse;

      if (this.currentView === 'week') {
        response = await firstValueFrom(this.appointmentsApi.listCalendarWeek(query));
      } else {
        response = await firstValueFrom(this.appointmentsApi.listCalendarMonth(query));
      }

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.currentRangeLabel =
        response.view === 'week'
          ? buildWeekRangeLabel(response.activeDate)
          : buildMonthLabel(response.activeDate);
      this.activeDate = response.activeDate;
      this.monthCells =
        response.view === 'month'
          ? buildAppointmentMonthCells(response.activeDate, response.appointments)
          : [];
      this.weekDays =
        response.view === 'week'
          ? buildAppointmentWeekDays(response.activeDate, response.appointments)
          : [];
      this.summary = buildAppointmentSummary(response.appointments);
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError =
        this.currentView === 'week'
          ? 'No se pudo cargar la agenda semanal.'
          : 'No se pudo cargar la agenda mensual.';
      this.monthCells = [];
      this.weekDays = [];
      this.summary = EMPTY_APPOINTMENT_SUMMARY;
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private buildCalendarQuery(): AppointmentCalendarQuery {
    const rangeStart =
      this.currentView === 'week' ? startOfWeek(this.activeDate) : startOfMonth(this.activeDate);
    const rangeEnd =
      this.currentView === 'week' ? endOfWeek(this.activeDate) : endOfMonth(this.activeDate);

    return {
      view: this.currentView,
      activeDate: this.activeDate,
      from: formatDateKey(rangeStart),
      to: formatDateKey(rangeEnd),
    };
  }
}
