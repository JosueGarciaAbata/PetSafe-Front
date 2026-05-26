import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@app/core/auth/auth.service';
import { resolveApiErrorMessage } from '@app/core/errors/api-error-message.util';
import { AppToastService } from '@app/core/ui/app-toast.service';
import { ShellIconComponent } from '@app/shell/shell-icon.component';
import { ConfirmDialogComponent } from '@app/shared/confirm-dialog/confirm-dialog.component';
import { EMPTY_PAGINATION_META, PaginationMeta } from '@app/shared/pagination/pagination.model';
import { PaginationComponent } from '@app/shared/pagination/pagination.component';
import { ZootecniaCatalogApiService } from '../api/zootecnia-catalog-api.service';
import {
  BreedFormPayload,
  BreedItem,
  SpeciesFormPayload,
  SpeciesItem,
  ZootecniaCatalogKind,
  ZootecnicalGroupFormPayload,
  ZootecnicalGroupItem,
} from '../models/zootecnia-catalog.model';
import { ZootecniaFormModalComponent, ZootecniaFormPayload } from './zootecnia-form-modal.component';

interface ZootecniaPageMeta {
  eyebrow: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  createLabel: string;
  itemSingular: string;
  itemPlural: string;
  parentColumn: string | null;
}

const PAGE_META_BY_KIND: Record<ZootecniaCatalogKind, ZootecniaPageMeta> = {
  ZOOTECNICAL_GROUP: {
    eyebrow: 'Catálogos · Zootecnia',
    title: 'Grupos Zootécnicos',
    description: 'Gestiona los grupos zootécnicos para la clasificación de especies.',
    searchPlaceholder: 'Buscar por nombre',
    createLabel: 'Nuevo grupo',
    itemSingular: 'grupo zootécnico',
    itemPlural: 'grupos zootécnicos',
    parentColumn: null,
  },
  SPECIES: {
    eyebrow: 'Catálogos · Zootecnia',
    title: 'Especies',
    description: 'Gestiona las especies animales registradas dentro de cada grupo zootécnico.',
    searchPlaceholder: 'Buscar por nombre',
    createLabel: 'Nueva especie',
    itemSingular: 'especie',
    itemPlural: 'especies',
    parentColumn: 'Grupo zootécnico',
  },
  BREED: {
    eyebrow: 'Catálogos · Zootecnia',
    title: 'Razas',
    description: 'Gestiona las razas de cada especie registrada en el sistema.',
    searchPlaceholder: 'Buscar por nombre',
    createLabel: 'Nueva raza',
    itemSingular: 'raza',
    itemPlural: 'razas',
    parentColumn: 'Especie',
  },
};

@Component({
  selector: 'app-zootecnia-catalog-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ShellIconComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    ZootecniaFormModalComponent,
  ],
  templateUrl: './zootecnia-catalog-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZootecniaCatalogPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(AppToastService);
  private readonly api = inject(ZootecniaCatalogApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  private catalogKind: ZootecniaCatalogKind = 'ZOOTECNICAL_GROUP';

  protected items: any[] = [];
  protected searchTerm = '';
  protected paginationMeta: PaginationMeta = { ...EMPTY_PAGINATION_META, itemsPerPage: 10 };

  protected isLoading = false;
  protected isSaving = false;
  protected isDeletingId: number | null = null;
  protected loadError: string | null = null;
  protected modalError: string | null = null;

  protected isFormModalOpen = false;
  protected editingItem: any | null = null;
  protected deleteTarget: any | null = null;

  /** Options for FK selects in form modal */
  protected zootecnicalGroupOptions: ZootecnicalGroupItem[] = [];
  protected speciesOptions: SpeciesItem[] = [];

  ngOnInit(): void {
    const routeKind = this.route.snapshot.data['catalogKind'];
    if (routeKind === 'SPECIES' || routeKind === 'BREED') {
      this.catalogKind = routeKind;
    } else {
      this.catalogKind = 'ZOOTECNICAL_GROUP';
    }
    void this.loadItems();
  }

  protected pageMeta(): ZootecniaPageMeta {
    return PAGE_META_BY_KIND[this.catalogKind];
  }

  protected currentCatalogKind(): ZootecniaCatalogKind {
    return this.catalogKind;
  }

  protected canManageItems(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'MVZ']);
  }

  protected canDeleteItems(): boolean {
    return this.authService.hasAnyRole(['ADMIN']);
  }

  /* ─── Helpers de visualización ─── */

  protected itemParentName(item: any): string {
    if (this.catalogKind === 'SPECIES') {
      return (item as SpeciesItem).zootecnicalGroup?.name ?? '—';
    }
    if (this.catalogKind === 'BREED') {
      return (item as BreedItem).species?.name ?? '—';
    }
    return '';
  }

  protected itemDescription(item: any): string {
    return item.description?.trim() || `Sin descripción adicional.`;
  }

  protected itemOrderLabel(index: number): string {
    const offset = (this.paginationMeta.currentPage - 1) * this.paginationMeta.itemsPerPage;
    return String(offset + index + 1).padStart(2, '0');
  }

  /* ─── Modales ─── */

  protected async openCreateModal(): Promise<void> {
    this.editingItem = null;
    this.modalError = null;
    await this.loadFkOptions();
    this.isFormModalOpen = true;
    this.cdr.detectChanges();
  }

  protected async openEditModal(item: any): Promise<void> {
    this.editingItem = item;
    this.modalError = null;
    await this.loadFkOptions();
    this.isFormModalOpen = true;
    this.cdr.detectChanges();
  }

  protected closeFormModal(): void {
    if (this.isSaving) return;
    this.isFormModalOpen = false;
    this.modalError = null;
    this.editingItem = null;
  }

  protected openDeleteModal(item: any): void {
    this.deleteTarget = item;
  }

  protected closeDeleteModal(): void {
    if (this.isDeletingId !== null) return;
    this.deleteTarget = null;
  }

  /* ─── Search & Pagination ─── */

  protected onSearchChange(): void {
    this.paginationMeta.currentPage = 1;
    void this.loadItems();
  }

  protected onPageChange(page: number): void {
    this.paginationMeta.currentPage = page;
    void this.loadItems();
  }

  /* ─── CRUD ─── */

  protected async saveItem(payload: ZootecniaFormPayload): Promise<void> {
    if (!this.canManageItems() || this.isSaving) return;

    this.isSaving = true;
    this.modalError = null;
    this.cdr.detectChanges();

    try {
      const singular = this.pageMeta().itemSingular;

      switch (this.catalogKind) {
        case 'ZOOTECNICAL_GROUP':
          if (this.editingItem) {
            await firstValueFrom(this.api.updateZootecnicalGroup(this.editingItem.id, payload as ZootecnicalGroupFormPayload));
            this.toast.success('Grupo zootécnico actualizado.');
          } else {
            await firstValueFrom(this.api.createZootecnicalGroup(payload as ZootecnicalGroupFormPayload));
            this.toast.success('Grupo zootécnico creado.');
          }
          break;

        case 'SPECIES':
          if (this.editingItem) {
            await firstValueFrom(this.api.updateSpecies(this.editingItem.id, payload as SpeciesFormPayload));
            this.toast.success('Especie actualizada.');
          } else {
            await firstValueFrom(this.api.createSpecies(payload as SpeciesFormPayload));
            this.toast.success('Especie creada.');
          }
          break;

        case 'BREED':
          if (this.editingItem) {
            await firstValueFrom(this.api.updateBreed(this.editingItem.id, payload as BreedFormPayload));
            this.toast.success('Raza actualizada.');
          } else {
            await firstValueFrom(this.api.createBreed(payload as BreedFormPayload));
            this.toast.success('Raza creada.');
          }
          break;
      }

      this.closeFormModal();
      await this.loadItems();
    } catch (error: unknown) {
      this.modalError = resolveApiErrorMessage(error, {
        defaultMessage: `No se pudo guardar el/la ${this.pageMeta().itemSingular}.`,
      });
      this.toast.error(this.modalError);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected async deleteItem(): Promise<void> {
    if (!this.canDeleteItems() || this.isDeletingId !== null || !this.deleteTarget) return;

    const target = this.deleteTarget;
    this.isDeletingId = target.id;
    this.cdr.detectChanges();

    try {
      switch (this.catalogKind) {
        case 'ZOOTECNICAL_GROUP':
          await firstValueFrom(this.api.deleteZootecnicalGroup(target.id));
          this.toast.success('Grupo zootécnico eliminado.');
          break;
        case 'SPECIES':
          await firstValueFrom(this.api.deleteSpecies(target.id));
          this.toast.success('Especie eliminada.');
          break;
        case 'BREED':
          await firstValueFrom(this.api.deleteBreed(target.id));
          this.toast.success('Raza eliminada.');
          break;
      }

      this.deleteTarget = null;
      await this.loadItems();
    } catch (error: unknown) {
      this.toast.error(
        resolveApiErrorMessage(error, {
          defaultMessage: `No se pudo eliminar el/la ${this.pageMeta().itemSingular}.`,
        }),
      );
    } finally {
      this.isDeletingId = null;
      this.cdr.detectChanges();
    }
  }

  protected deleteDialogTitle(): string {
    return `Eliminar ${this.pageMeta().itemSingular}`;
  }

  protected deleteDialogMessage(): string {
    return `¿Estás seguro de eliminar "${this.deleteTarget?.name ?? 'este elemento'}"? Esta acción no se puede deshacer si tiene registros asociados.`;
  }

  /* ─── Data loading ─── */

  private async loadItems(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    try {
      const page = this.paginationMeta.currentPage;
      const limit = this.paginationMeta.itemsPerPage;
      const search = this.searchTerm.trim() || undefined;

      let response: any;

      switch (this.catalogKind) {
        case 'ZOOTECNICAL_GROUP':
          response = await firstValueFrom(this.api.listZootecnicalGroups(page, limit, search));
          break;
        case 'SPECIES':
          response = await firstValueFrom(this.api.listSpecies(page, limit, search));
          break;
        case 'BREED':
          response = await firstValueFrom(this.api.listBreeds(page, limit, search));
          break;
      }

      this.items = response.data;

      const meta = response.meta;
      Object.assign(this.paginationMeta, {
        totalItems: meta.totalItems,
        itemCount: meta.itemCount,
        itemsPerPage: meta.itemsPerPage,
        totalPages: Math.max(meta.totalPages, 1),
        currentPage: meta.currentPage,
        hasNextPage: meta.currentPage < meta.totalPages,
        hasPrevPage: meta.currentPage > 1,
      });
    } catch (error: unknown) {
      this.loadError = resolveApiErrorMessage(error, {
        defaultMessage: `No se pudo cargar el catálogo de ${this.pageMeta().itemPlural}.`,
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadFkOptions(): Promise<void> {
    try {
      if (this.catalogKind === 'SPECIES') {
        const res = await firstValueFrom(this.api.listAllZootecnicalGroups());
        this.zootecnicalGroupOptions = res.data;
      } else if (this.catalogKind === 'BREED') {
        const res = await firstValueFrom(this.api.listAllSpecies());
        this.speciesOptions = res.data;
      }
    } catch {
      // Silently fail — user will see an empty select
    }
  }
}
