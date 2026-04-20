import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PetPublicApiService, PublicPetProfileResponse } from './pet-public-api.service';

@Component({
  selector: 'app-pet-public-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pet-public-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetPublicProfileComponent implements OnInit {
  private readonly api = inject(PetPublicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  protected isLoading = true;
  protected loadError: string | null = null;
  protected pet: PublicPetProfileResponse | null = null;

  ngOnInit(): void {
    const qrToken = this.route.snapshot.paramMap.get('qrToken');
    if (!qrToken) {
      this.isLoading = false;
      this.loadError = 'Código QR inválido.';
      this.cdr.detectChanges();
      return;
    }
    void this.load(qrToken);
  }

  private async load(qrToken: string): Promise<void> {
    try {
      this.pet = await firstValueFrom(this.api.getByQrToken(qrToken));
    } catch {
      this.loadError = 'No se encontró información para este código QR.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  protected buildSexLabel(sex: string | null): string {
    switch ((sex ?? '').toUpperCase()) {
      case 'MACHO': return 'Macho';
      case 'HEMBRA': return 'Hembra';
      default: return 'No especificado';
    }
  }

  protected buildAgeLabel(birthDate: string | null): string {
    if (!birthDate) return 'No registrada';
    const d = new Date(birthDate);
    if (Number.isNaN(d.getTime())) return birthDate.slice(0, 10);
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) {
      years--;
    }
    return years <= 0 ? 'Menos de 1 año' : `${years} ${years === 1 ? 'año' : 'años'}`;
  }

  protected petInitial(): string {
    return this.pet?.name?.trim().charAt(0).toUpperCase() ?? 'M';
  }
}
