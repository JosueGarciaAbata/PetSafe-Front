import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateOwnerModalComponent } from '../create/create-owner-modal.component';
import { OwnerDetailComponent } from '../detail/owner-detail.component';
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
  imports: [
    CreateOwnerModalComponent,
    OwnerDetailComponent,
    PaginationComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './owners-page.component.html',
  styleUrl: './owners-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnersPageComponent implements OnInit {
  private readonly ownersApi = inject(OwnersApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly pageSize = 10;

  protected owners: readonly ClientSummaryItemApiResponse[] = [];
  protected paginationMeta: PaginationMeta = EMPTY_PAGINATION_META;
  protected isLoading = false;
  protected loadError: string | null = null;
  protected isCreateOwnerModalOpen = false;
  protected selectedOwnerId: string | null = null;

  private requestVersion = 0;

  ngOnInit(): void {
    const state = history.state as { ownerId?: string; openCreateModal?: boolean } | null;
    this.selectedOwnerId = state?.ownerId != null ? String(state.ownerId) : null;
    this.isCreateOwnerModalOpen = Boolean(state?.openCreateModal);

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.loadOwners(1);
      });

    void this.loadOwners(1);
  }

  protected get selectedOwner(): ClientSummaryItemApiResponse | null {
    if (!this.selectedOwnerId) {
      return null;
    }

    return this.owners.find((owner) => String(owner.id) === this.selectedOwnerId) ?? null;
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

  protected openCreateOwnerModal(): void {
    this.isCreateOwnerModalOpen = true;
  }

  protected closeCreateOwnerModal(): void {
    this.isCreateOwnerModalOpen = false;
  }

  protected saveCreateOwnerDraft(): void {
    this.closeCreateOwnerModal();
    void this.loadOwners(1);
  }

  protected openOwnerDetail(owner: ClientSummaryItemApiResponse): void {
    this.selectedOwnerId = String(owner.id);
  }

  protected closeOwnerDetail(): void {
    this.selectedOwnerId = null;
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

      if (this.selectedOwnerId && !owners.some((owner) => String(owner.id) === this.selectedOwnerId)) {
        await this.searchOwnerAcrossPages(
          this.selectedOwnerId,
          this.paginationMeta.totalPages,
          requestToken,
          searchTerm,
        );
        return;
      }
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

  private async searchOwnerAcrossPages(
    ownerId: string,
    totalPages: number,
    requestToken: number,
    searchTerm?: string,
  ): Promise<void> {
    for (let page = 2; page <= totalPages; page += 1) {
      if (requestToken !== this.requestVersion) {
        return;
      }

      const response = await firstValueFrom(
        this.ownersApi.listSummary({
          page,
          limit: this.pageSize,
          searchTerm: searchTerm || undefined,
        }),
      );

      console.log("Response for page", page, response);

      if (requestToken !== this.requestVersion) {
        return;
      }

      const owners = this.normalizeOwners(response?.data);
      const foundOwner = owners.find((owner) => String(owner.id) === ownerId);

      if (foundOwner) {
        this.owners = owners;
        this.paginationMeta = response?.meta ?? {
          ...EMPTY_PAGINATION_META,
          currentPage: page,
          itemCount: owners.length,
          totalItems: owners.length,
        };
        this.selectedOwnerId = ownerId;
        this.cdr.markForCheck();
        return;
      }
    }

    this.selectedOwnerId = null;
    this.cdr.markForCheck();
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
