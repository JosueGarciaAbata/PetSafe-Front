import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OwnersApiService } from '../api/owners-api.service';
import { ClientResponseApiResponse } from '../models/client-detail.model';
import { ClientTutorBasicApiResponse } from '../models/client-tutor-basic.model';

@Component({
  selector: 'app-owner-create-next-steps-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './owner-create-next-steps-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerCreateNextStepsPageComponent implements OnInit {
  private readonly ownersApi = inject(OwnersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected owner: ClientResponseApiResponse | null =
    (history.state as { owner?: ClientResponseApiResponse | null } | null)?.owner ?? null;
  protected isLoading = !this.owner;
  protected loadError: string | null = null;

  ngOnInit(): void {
    const ownerId = this.route.snapshot.paramMap.get('id');
    if (!ownerId) {
      void this.router.navigate(['/owners']);
      return;
    }

    if (!this.owner) {
      void this.loadOwner(ownerId);
    }
  }

  protected openCreatePetPage(): void {
    if (!this.owner) {
      return;
    }

    void this.router.navigate(['/pets/new'], {
      state: {
        initialTutor: this.buildInitialTutor(),
        quickCreateForTutor: true,
        ownerBackTarget: ['/owners', this.owner.id],
        ownerBackLabel: 'Volver al tutor',
      },
    });
  }

  protected buildTutorName(): string {
    if (!this.owner) {
      return 'Tutor recién registrado';
    }

    return `${this.owner.person.firstName} ${this.owner.person.lastName}`.trim();
  }

  protected buildTutorPhone(): string {
    return this.owner?.person.phone?.trim() || 'Sin teléfono registrado';
  }

  protected buildTutorEmail(): string {
    return this.owner?.email?.trim() || 'Sin correo registrado';
  }

  protected buildTutorCedula(): string {
    return this.owner?.person.documentId?.trim() || 'Sin cédula registrada';
  }

  private buildInitialTutor(): ClientTutorBasicApiResponse {
    return {
      id: this.owner?.id ?? 0,
      firstName: this.owner?.person.firstName ?? '',
      lastName: this.owner?.person.lastName ?? '',
      phone: this.owner?.person.phone ?? null,
    };
  }

  private async loadOwner(ownerId: string): Promise<void> {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.markForCheck();

    try {
      this.owner = await firstValueFrom(this.ownersApi.getClientById(ownerId));
    } catch {
      this.loadError = 'No se pudo cargar el tutor recién creado.';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
}
