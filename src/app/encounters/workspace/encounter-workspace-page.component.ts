import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EncountersApiService } from '../api/encounters-api.service';
import { EncounterDetail } from '../models/encounter.model';

type TabView = 'REASON' | 'ANAMNESIS' | 'EXAM' | 'ENVIRONMENT' | 'IMPRESSION' | 'PLAN';

@Component({
  selector: 'app-encounter-workspace-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './encounter-workspace-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterWorkspacePageComponent implements OnInit {
  private readonly encountersApi = inject(EncountersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  protected encounter: EncounterDetail | null = null;
  protected isLoading = true;
  protected isSaving = false;
  protected activeTab: TabView = 'REASON';
  protected loadError: string | null = null;

  // Forms for each tab
  protected reasonForm = new FormGroup({
    consultationReason: new FormControl(''),
    currentIllnessHistory: new FormControl(''),
    referredPreviousDiagnoses: new FormControl(''),
    referredPreviousTreatments: new FormControl(''),
  });

  protected anamnesisForm = new FormGroup({
    problemStartText: new FormControl(''),
    vaccinesUpToDate: new FormControl<boolean | null>(null),
    dewormingUpToDate: new FormControl<boolean | null>(null),
    notes: new FormControl(''),
  });

  protected examForm = new FormGroup({
    weightKg: new FormControl<number | null>(null),
    temperatureC: new FormControl<number | null>(null),
    heartRate: new FormControl<number | null>(null),
    examNotes: new FormControl(''),
  });

  protected impressionForm = new FormGroup({
    presumptiveDiagnosis: new FormControl(''),
    clinicalNotes: new FormControl(''),
  });

  protected planForm = new FormGroup({
    clinicalPlan: new FormControl(''),
    planNotes: new FormControl(''),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.loadEncounter(Number(id));
    } else {
      this.loadError = 'ID de consulta no proporcionado.';
      this.isLoading = false;
    }
  }

  private async loadEncounter(id: number): Promise<void> {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      const data = await firstValueFrom(this.encountersApi.getById(id));
      this.encounter = data;

      // Patch values
      if (data.consultationReason) {
        this.reasonForm.patchValue(data.consultationReason);
      }
      if (data.anamnesis) {
        this.anamnesisForm.patchValue(data.anamnesis);
      }
      if (data.clinicalExam) {
        this.examForm.patchValue(data.clinicalExam);
      }
      if (data.clinicalImpression) {
        this.impressionForm.patchValue(data.clinicalImpression);
      }
      if (data.plan) {
        this.planForm.patchValue(data.plan);
      }

    } catch (e) {
      this.loadError = 'No se pudo cargar la consulta médica.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  protected setTab(tab: TabView): void {
    this.activeTab = tab;
  }

  protected async saveReason(): Promise<void> {
    if (!this.encounter) return;
    this.isSaving = true;
    this.cdr.detectChanges();
    try {
      await firstValueFrom(this.encountersApi.updateReason(this.encounter.id, this.reasonForm.value));
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected async saveAnamnesis(): Promise<void> {
    if (!this.encounter) return;
    this.isSaving = true;
    this.cdr.detectChanges();
    try {
      await firstValueFrom(this.encountersApi.updateAnamnesis(this.encounter.id, this.anamnesisForm.value));
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected async saveExam(): Promise<void> {
    if (!this.encounter) return;
    this.isSaving = true;
    this.cdr.detectChanges();
    try {
      await firstValueFrom(this.encountersApi.updateClinicalExam(this.encounter.id, this.examForm.value));
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected async saveImpression(): Promise<void> {
    if (!this.encounter) return;
    this.isSaving = true;
    this.cdr.detectChanges();
    try {
      await firstValueFrom(this.encountersApi.updateImpression(this.encounter.id, this.impressionForm.value));
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected async savePlan(): Promise<void> {
    if (!this.encounter) return;
    this.isSaving = true;
    this.cdr.detectChanges();
    try {
      await firstValueFrom(this.encountersApi.updatePlan(this.encounter.id, this.planForm.value));
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected async finishEncounter(): Promise<void> {
    if (!this.encounter) return;
    if (!confirm('¿Seguro que deseas finalizar esta consulta médica?')) return;
    
    this.isSaving = true;
    this.cdr.detectChanges();
    try {
      await firstValueFrom(this.encountersApi.finish(this.encounter.id));
      void this.router.navigate(['/queue']);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected goBack(): void {
    void this.router.navigate(['/queue']);
  }
}
