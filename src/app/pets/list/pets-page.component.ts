import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PetApiResponse } from '../models/pet.model';
import { PetDetailComponent } from '../detail/pet-detail.component';

const MOCK_PET: PetApiResponse = {
  id: 'pet-001',
  nombre: 'Luna',
  especie: 'Perro',
  raza: 'Golden Retriever',
  imagen:
    'https://images.unsplash.com/photo-1754080809425-fb52b95d1069?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkZW4lMjByZXRyaWV2ZXIlMjBoZWFkJTIwcG9ydHJhaXQlMjByb3VuZGVkfGVufDF8fHx8MTc3Mzg3NDE0N3ww',
  tutor: {
    id: '43f00bfc-aadb-4701-b67b-9f5832e43b70',
    nombre: 'Adriana',
    apellido: 'Montes',
    contacto: '+34 612 345 678',
    email: 'adriana.montes@email.com',
    direccion: 'Calle Mayor 12, Madrid',
  },
  edad: '3 años',
  genero: 'Hembra',
  pesoKg: '26',
  color: 'Dorado',
  esterilizado: 'Sí',
  fechaNacimiento: '2023-03-15',
  observaciones: 'Alérgica a ciertos tipos de gramíneas. Muy dócil durante las consultas.',
};

@Component({
  selector: 'app-pets-page',
  standalone: true,
  imports: [PetDetailComponent],
  templateUrl: './pets-page.component.html',
  styleUrl: './pets-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetsPageComponent {
  protected readonly pets: readonly PetApiResponse[] = [MOCK_PET];
  protected selectedPetId: string | null = null;

  protected get selectedPet(): PetApiResponse | null {
    if (!this.selectedPetId) {
      return null;
    }

    return this.pets.find((pet) => pet.id === this.selectedPetId) ?? null;
  }

  protected openPetDetail(pet: PetApiResponse): void {
    this.selectedPetId = pet.id;
  }

  protected closePetDetail(): void {
    this.selectedPetId = null;
  }

  protected getInitials(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  protected buildPetSubtitle(pet: PetApiResponse): string {
    const species = pet.especie?.trim() || 'Sin especie registrada';
    const breed = pet.raza?.trim() || 'Sin raza registrada';

    return `${species} · ${breed}`;
  }

  protected buildTutorName(pet: PetApiResponse): string {
    return `${pet.tutor.nombre} ${pet.tutor.apellido}`.trim();
  }

  protected buildBasicInfo(pet: PetApiResponse): string {
    return `${pet.edad} · ${pet.genero} · ${pet.pesoKg} kg`;
  }
}
