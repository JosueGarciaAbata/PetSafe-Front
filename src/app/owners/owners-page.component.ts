import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CreateOwnerModalComponent } from './create-owner-modal.component';
import { OwnerDetailComponent } from './owner-detail.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { OwnerApiResponse, OwnerGender } from './owner.model';

const MOCK_OWNER: OwnerApiResponse = {
  id: '43f00bfc-aadb-4701-b67b-9f5832e43b70',
  cedula: '12345678A',
  nombre: 'Adriana',
  apellido: 'Montes',
  genero: 'Femenino',
  numero_telefonico: '+34 612 345 678',
  contacto: {
    correo_electronico: 'adriana.montes@email.com',
    direccion: 'Calle Mayor 12, Madrid',
  },
  mascotas_asociadas: {
    array_nombres: ['Luna', 'Max'],
    total_mascotas: 5,
  },
};

@Component({
  selector: 'app-owners-page',
  standalone: true,
  imports: [CreateOwnerModalComponent, OwnerDetailComponent, MatFormFieldModule, MatInputModule],
  templateUrl: './owners-page.component.html',
  styleUrl: './owners-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnersPageComponent {
  protected readonly owners: readonly OwnerApiResponse[] = [MOCK_OWNER];
  protected isCreateOwnerModalOpen = false;
  protected createOwnerGender: OwnerGender = 'Femenino';
  protected selectedOwnerId: string | null = null;

  protected get selectedOwner(): OwnerApiResponse | null {
    if (!this.selectedOwnerId) {
      return null;
    }

    return this.owners.find((owner) => owner.id === this.selectedOwnerId) ?? null;
  }

  protected buildFullName(owner: OwnerApiResponse): string {
    return `${owner.nombre} ${owner.apellido}`.trim();
  }

  protected buildInitials(owner: OwnerApiResponse): string {
    return `${owner.nombre.charAt(0)}${owner.apellido.charAt(0)}`.toUpperCase();
  }

  protected getExtraPetsCount(owner: OwnerApiResponse): number {
    return Math.max(
      owner.mascotas_asociadas.total_mascotas - owner.mascotas_asociadas.array_nombres.length,
      0,
    );
  }

  protected openCreateOwnerModal(): void {
    this.createOwnerGender = 'Femenino';
    this.isCreateOwnerModalOpen = true;
  }

  protected closeCreateOwnerModal(): void {
    this.isCreateOwnerModalOpen = false;
  }

  protected saveCreateOwnerDraft(): void {
    this.closeCreateOwnerModal();
  }

  protected setCreateOwnerGender(gender: OwnerGender): void {
    this.createOwnerGender = gender;
  }

  protected openOwnerDetail(owner: OwnerApiResponse): void {
    this.selectedOwnerId = owner.id;
  }

  protected closeOwnerDetail(): void {
    this.selectedOwnerId = null;
  }
}
