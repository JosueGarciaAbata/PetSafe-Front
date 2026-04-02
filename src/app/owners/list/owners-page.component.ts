import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OwnersApiService } from '../api/owners-api.service';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import { EMPTY_PAGINATION_META, PaginationMeta } from '@app/shared/pagination/pagination.model';
import {
  ClientSummaryItemApiResponse,
  buildClientFullName,
  buildClientInitials,
  getExtraClientPetsCount,
} from '../models/client-summary.model';

@Component({
  selector: 'app-owners-page',
  standalone: true,
  imports: [PaginationComponent, ReactiveFormsModule],
  templateUrl: './owners-page.component.html',
  styleUrl: './owners-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnersPageComponent implements OnInit {
  private readonly ownersApi = inject(OwnersApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly pageSize = 10;

  protected owners: readonly ClientSummaryItemApiResponse[] = [];
  protected paginationMeta: PaginationMeta = EMPTY_PAGINATION_META;
  protected isLoading = false;
  protected loadError: string | null = null;

  private requestVersion = 0;

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.loadOwners(1);
      });

    void this.loadOwners(1);
  }

  protected buildFullName(owner: ClientSummaryItemApiResponse): string {
    return buildClientFullName(owner);
  }

  protected buildInitials(owner: ClientSummaryItemApiResponse): string {
    return buildClientInitials(owner);
  }

  protected buildPhone(owner: ClientSummaryItemApiResponse): string {
    return owner.person?.phone?.trim() || 'Sin telefono registrado';
  }

  protected buildAddress(owner: ClientSummaryItemApiResponse): string {
    return owner.person?.address?.trim() || 'Sin direccion registrada';
  }

  protected getExtraPetsCount(owner: ClientSummaryItemApiResponse): number {
    return getExtraClientPetsCount(owner);
  }

  protected openCreateOwnerPage(): void {
    void this.router.navigate(['/owners/new']);
  }

  protected openOwnerDetail(owner: ClientSummaryItemApiResponse): void {
    void this.router.navigate(['/owners', owner.id]);
  }

  protected onPageChange(page: number): void {
    void this.loadOwners(page);
  }

  protected retryLoadOwners(): void {
    void this.loadOwners(this.paginationMeta.currentPage);
  }

  private async loadOwners(page: number): Promise<void> {
    const requestToken = ++this.requestVersion;
    const searchTerm = this.searchControl.value.trim();

    this.isLoading = true;
    this.loadError = null;
    this.owners = [];
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(
        this.ownersApi.listSummary({
          page,
          limit: this.pageSize,
          searchTerm: searchTerm || undefined,
        }),
      );

      if (requestToken !== this.requestVersion) {
        return;
      }

      const owners = this.normalizeOwners(response?.data);
      this.owners = owners;
      this.paginationMeta = response?.meta ?? {
        ...EMPTY_PAGINATION_META,
        currentPage: page,
        itemCount: owners.length,
        totalItems: owners.length,
      };
    } catch {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.loadError = 'No se pudieron cargar los propietarios.';
      this.paginationMeta = EMPTY_PAGINATION_META;
    } finally {
      if (requestToken !== this.requestVersion) {
        return;
      }

      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private normalizeOwners(items: ClientSummaryItemApiResponse[] | undefined): ClientSummaryItemApiResponse[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((owner) => {
      const pets = Array.isArray(owner?.pets) ? owner.pets : [];

      return {
        ...owner,
        email: owner?.email ?? null,
        person: {
          id: owner?.person?.id ?? 0,
          firstName: owner?.person?.firstName ?? '',
          lastName: owner?.person?.lastName ?? '',
          documentId: owner?.person?.documentId ?? null,
          phone: owner?.person?.phone ?? null,
          address: owner?.person?.address ?? null,
          gender: owner?.person?.gender ?? null,
          birthDate: owner?.person?.birthDate ?? null,
        },
        pets,
        petsCount: typeof owner?.petsCount === 'number' ? owner.petsCount : pets.length,
      };
    });
  }
}
