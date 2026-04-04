import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import {
  EMPTY_PAGINATION_META,
  PaginationMeta,
} from '@app/shared/pagination/pagination.model';
import { AdoptionsApiService } from '../api/adoptions-api.service';
import { AdoptionBasicItemApiResponse } from '../models/adoption.model';

@Component({
  selector: 'app-adoptions-page',
  standalone: true,
  imports: [PaginationComponent],
  templateUrl: './adoptions-page.component.html',
  styleUrl: './adoptions-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdoptionsPageComponent implements OnInit {
  private readonly adoptionsApi = inject(AdoptionsApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pageSize = 10;
  private requestVersion = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private readonly navigationState = history.state as {
    successMessage?: string | null;
  } | null;

  protected adoptions: AdoptionBasicItemApiResponse[] = [];
  protected meta: PaginationMeta = EMPTY_PAGINATION_META;
  protected searchValue = '';
  protected isLoading = false;
  protected loadError: string | null = null;
  protected readonly successMessage = this.navigationState?.successMessage?.trim() || null;

  ngOnInit(): void {
    void this.loadAdoptions(1);
  }

  protected onSearchInput(value: string): void {
    this.searchValue = value;
    this.scheduleSearch();
  }

  protected onPageChange(page: number): void {
    this.clearSearchTimer();
    void this.loadAdoptions(page);
  }

  protected retryLoadAdoptions(): void {
    void this.loadAdoptions(this.meta.currentPage);
  }

  protected openCreatePage(): void {
    void this.router.navigate(['/adoption/new']);
  }

  protected openEditPage(adoptionId: number): void {
    void this.router.navigate(['/adoption', adoptionId, 'edit']);
  }

  protected getInitials(name: string): string {
    return name.trim().charAt(0).toUpperCase() || 'A';
  }

  protected buildPetSubtitle(adoption: AdoptionBasicItemApiResponse): string {
    const species = adoption.speciesName?.trim() || 'Sin especie registrada';
    const breed = adoption.breedName?.trim() || 'Sin raza registrada';
    return `${species} - ${breed}`;
  }

  protected buildBasicInfo(adoption: AdoptionBasicItemApiResponse): string {
    return `${this.buildAgeLabel(adoption)} - ${this.buildWeightLabel(adoption)}`;
  }

  protected buildBirthDateLabel(adoption: AdoptionBasicItemApiResponse): string {
    if (!adoption.birthDate) {
      return 'Nacimiento no registrado';
    }

    return `Nacimiento: ${adoption.birthDate.slice(0, 10)}`;
  }

  protected buildStatusLabel(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'RESERVADO':
        return 'Reservado';
      case 'ADOPTADO':
        return 'Adoptado';
      case 'NO_DISPONIBLE':
        return 'No disponible';
      default:
        return status?.trim() || 'Sin estado';
    }
  }

  protected buildStatusClass(status: string | null | undefined): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'DISPONIBLE':
        return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]';
      case 'RESERVADO':
        return 'border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]';
      case 'ADOPTADO':
        return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]';
      default:
        return 'border-border bg-background text-text-secondary';
    }
  }

  protected buildNotesPreview(adoption: AdoptionBasicItemApiResponse): string {
    const notes = adoption.notes?.trim();
    return notes && notes.length > 0 ? notes : 'Sin notas registradas';
  }

  protected hasAdopter(adoption: AdoptionBasicItemApiResponse): boolean {
    return adoption.adopterClientId !== null && adoption.adopterClientId !== undefined;
  }

  private buildAgeLabel(adoption: AdoptionBasicItemApiResponse): string {
    if (adoption.ageYears === null || adoption.ageYears === undefined) {
      return 'Edad no registrada';
    }

    return `${adoption.ageYears} ${adoption.ageYears === 1 ? 'ano' : 'anos'}`;
  }

  private buildWeightLabel(adoption: AdoptionBasicItemApiResponse): string {
    if (adoption.currentWeight === null || adoption.currentWeight === undefined) {
      return 'Peso no registrado';
    }

    return `${adoption.currentWeight} kg`;
  }

  private scheduleSearch(): void {
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      void this.loadAdoptions(1);
    }, 300);
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== undefined) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
  }

  private async loadAdoptions(page: number): Promise<void> {
    const requestToken = ++this.requestVersion;
    this.isLoading = true;
    this.loadError = null;
    this.adoptions = [];
    this.cdr.detectChanges();

    try {
      const response = await firstValueFrom(
        this.adoptionsApi.listBasic({
          page,
          limit: this.pageSize,
          search: this.searchValue.trim() || undefined,
        }),
      );

      if (requestToken !== this.requestVersion) {
        return;
      }

      this.adoptions = response.data;
      this.meta = response.meta;
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudo cargar el listado de adopciones.';
      this.meta = EMPTY_PAGINATION_META;
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
