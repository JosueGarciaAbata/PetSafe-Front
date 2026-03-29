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
import { AppointmentWeekCalendarComponent } from '../components/appointment-week-calendar.component';
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
import {
  buildAppointmentMonthCells,
  buildAppointmentSummary,
  buildAppointmentWeekDays,
} from '../utils/appointment-calendar.mapper';
import {
  buildFullDateLabel,
  endOfMonth,
  endOfWeek,
  formatDateKey,
  buildMonthLabel,
  startOfMonth,
  startOfWeek,
  buildWeekRangeLabel,
  buildWeekdayLabels,
  getTodayDateKey,
} from '../utils/appointment-date.util';

@Component({
  selector: 'app-appointments-page',
  standalone: true,
  imports: [CommonModule, AppointmentMonthCalendarComponent, AppointmentWeekCalendarComponent],
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
  protected monthLabel = buildMonthLabel(this.activeDate);
  protected todayLabel = buildFullDateLabel(this.activeDate);
  protected monthCells: readonly AppointmentMonthCell[] = [];
  protected weekDays: readonly AppointmentWeekDay[] = [];
  protected summary: AppointmentCalendarSummary = EMPTY_APPOINTMENT_SUMMARY;
  protected isLoading = false;
  protected loadError: string | null = null;
  protected createHintMessage: string | null = null;

  ngOnInit(): void {
    void this.loadAppointments();
  }

  protected openCreateAppointmentPlaceholder(): void {
    this.createHintMessage =
      'La creacion de nuevos turnos se habilitara en el siguiente paso.';
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

  private async loadAppointments(): Promise<void> {
    const requestToken = ++this.requestVersion;
    const query = this.buildCalendarQuery();

    this.isLoading = true;
    this.loadError = null;
    this.createHintMessage = null;
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

      this.monthLabel =
        response.view === 'week'
          ? buildWeekRangeLabel(response.activeDate)
          : buildMonthLabel(response.activeDate);
      this.todayLabel = buildFullDateLabel(response.activeDate);
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
