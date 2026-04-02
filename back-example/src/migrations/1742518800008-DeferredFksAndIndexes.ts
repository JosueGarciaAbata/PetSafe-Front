import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeferredFksAndIndexes1742518800008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Deferred deleted_by_user_id FKs (all tables → users) ──
    const deletedByFks: Array<{ table: string; constraint: string }> = [
      { table: 'roles', constraint: 'fk_roles_deleted_by' },
      { table: 'persons', constraint: 'fk_persons_deleted_by' },
      { table: 'users', constraint: 'fk_users_deleted_by' },
      { table: 'employees', constraint: 'fk_employees_deleted_by' },
      { table: 'clients', constraint: 'fk_clients_deleted_by' },
      { table: 'user_refresh_tokens', constraint: 'fk_refresh_tokens_deleted_by' },
      { table: 'user_password_reset_tokens', constraint: 'fk_pwd_tokens_deleted_by' },
      { table: 'species', constraint: 'fk_species_deleted_by' },
      { table: 'breeds', constraint: 'fk_breeds_deleted_by' },
      { table: 'colors', constraint: 'fk_colors_deleted_by' },
      { table: 'vaccines', constraint: 'fk_vaccines_deleted_by' },
      { table: 'antiparasitics', constraint: 'fk_antiparasitics_deleted_by' },
      { table: 'patients', constraint: 'fk_patients_deleted_by' },
      { table: 'patient_tutors', constraint: 'fk_patient_tutors_deleted_by' },
      { table: 'patient_conditions', constraint: 'fk_patient_conditions_deleted_by' },
      { table: 'appointments', constraint: 'fk_appointments_deleted_by' },
      { table: 'queue_entries', constraint: 'fk_queue_entries_deleted_by' },
      { table: 'encounters', constraint: 'fk_encounters_deleted_by' },
      { table: 'encounter_consultation_reasons', constraint: 'fk_encounters_reason_deleted_by' },
      { table: 'encounter_anamnesis', constraint: 'fk_encounters_anamnesis_deleted_by' },
      { table: 'encounter_clinical_exams', constraint: 'fk_encounters_exam_deleted_by' },
      { table: 'encounter_environmental_data', constraint: 'fk_encounters_env_deleted_by' },
      { table: 'encounter_clinical_impressions', constraint: 'fk_encounters_impression_deleted_by' },
      { table: 'encounter_plans', constraint: 'fk_encounters_plan_deleted_by' },
      { table: 'treatments', constraint: 'fk_treatments_deleted_by' },
      { table: 'treatment_items', constraint: 'fk_treatment_items_deleted_by' },
      { table: 'vaccination_events', constraint: 'fk_vaccination_events_deleted_by' },
      { table: 'deworming_events', constraint: 'fk_deworming_events_deleted_by' },
      { table: 'surgeries', constraint: 'fk_surgeries_deleted_by' },
      { table: 'procedures', constraint: 'fk_procedures_deleted_by' },
      { table: 'media_files', constraint: 'fk_media_files_deleted_by' },
    ];

    for (const fk of deletedByFks) {
      await queryRunner.query(`
        ALTER TABLE ${fk.table}
          ADD CONSTRAINT ${fk.constraint}
          FOREIGN KEY (deleted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      `);
    }

    // ── Unique Indexes (partial / conditional) ──
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_name_live ON roles(name) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_persons_document_live ON persons(document_id) WHERE document_id IS NOT NULL AND deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_users_person_live ON users(person_id) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_live ON users(email) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_person_live ON employees(person_id) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_code_live ON employees(code) WHERE code IS NOT NULL AND deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_person_live ON clients(person_id) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_species_name_live ON species(name) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_breeds_species_name_live ON breeds(species_id, name) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_colors_name_live ON colors(name) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_vaccines_name_live ON vaccines(name) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_antiparasitics_name_live ON antiparasitics(name) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_code_live ON patients(code) WHERE code IS NOT NULL AND deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_microchip_live ON patients(microchip_code) WHERE microchip_code IS NOT NULL AND deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_tutor_primary_live ON patient_tutors(patient_id) WHERE is_primary = true AND deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_vet_slot_live ON appointments(vet_id, scheduled_date, scheduled_time) WHERE deleted_at IS NULL AND status IN ('PROGRAMADA', 'CONFIRMADA', 'EN_PROCESO')`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_entries_appointment_live ON queue_entries(appointment_id) WHERE appointment_id IS NOT NULL AND deleted_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_encounter_active_by_patient_live ON encounters(patient_id) WHERE deleted_at IS NULL AND status = 'ACTIVA'`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_encounter_active_by_queue_live ON encounters(queue_entry_id) WHERE queue_entry_id IS NOT NULL AND deleted_at IS NULL AND status = 'ACTIVA'`);

    // ── General Indexes ──
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON roles(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_persons_deleted_at ON persons(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON user_refresh_tokens(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_deleted_at ON user_refresh_tokens(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_species_deleted_at ON species(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_breeds_species_id ON breeds(species_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_breeds_deleted_at ON breeds(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_colors_deleted_at ON colors(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vaccines_deleted_at ON vaccines(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_antiparasitics_deleted_at ON antiparasitics(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patients_species_id ON patients(species_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patients_breed_id ON patients(breed_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patients_color_id ON patients(color_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patients_deleted_at ON patients(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patient_tutors_client_id ON patient_tutors(client_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patient_tutors_deleted_at ON patient_tutors(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patient_conditions_patient_id ON patient_conditions(patient_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_patient_conditions_deleted_at ON patient_conditions(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_appointments_vet_id ON appointments(vet_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON appointments(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_queue_date ON queue_entries(date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_queue_patient_id ON queue_entries(patient_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_queue_vet_id ON queue_entries(vet_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_entries(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_queue_deleted_at ON queue_entries(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_encounters_vet_id ON encounters(vet_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_encounters_start_time ON encounters(start_time)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_encounters_deleted_at ON encounters(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_treatments_encounter_id ON treatments(encounter_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_treatments_deleted_at ON treatments(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_treatment_items_treatment_id ON treatment_items(treatment_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_treatment_items_deleted_at ON treatment_items(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vaccinations_encounter_id ON vaccination_events(encounter_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vaccinations_vaccine_id ON vaccination_events(vaccine_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vaccinations_deleted_at ON vaccination_events(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_deworming_encounter_id ON deworming_events(encounter_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_deworming_product_id ON deworming_events(product_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_deworming_deleted_at ON deworming_events(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_surgeries_encounter_id ON surgeries(encounter_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_surgeries_status ON surgeries(surgery_status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_surgeries_deleted_at ON surgeries(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_procedures_encounter_id ON procedures(encounter_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_procedures_deleted_at ON procedures(deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_media_files_owner ON media_files(owner_type, owner_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(media_type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_media_files_provider ON media_files(provider)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_media_files_deleted_at ON media_files(deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Drop general indexes ──
    const generalIndexes = [
      'idx_media_files_deleted_at', 'idx_media_files_provider', 'idx_media_files_type', 'idx_media_files_owner',
      'idx_procedures_deleted_at', 'idx_procedures_encounter_id',
      'idx_surgeries_deleted_at', 'idx_surgeries_status', 'idx_surgeries_encounter_id',
      'idx_deworming_deleted_at', 'idx_deworming_product_id', 'idx_deworming_encounter_id',
      'idx_vaccinations_deleted_at', 'idx_vaccinations_vaccine_id', 'idx_vaccinations_encounter_id',
      'idx_treatment_items_deleted_at', 'idx_treatment_items_treatment_id',
      'idx_treatments_deleted_at', 'idx_treatments_encounter_id',
      'idx_encounters_deleted_at', 'idx_encounters_start_time', 'idx_encounters_status', 'idx_encounters_vet_id', 'idx_encounters_patient_id',
      'idx_queue_deleted_at', 'idx_queue_status', 'idx_queue_vet_id', 'idx_queue_patient_id', 'idx_queue_date',
      'idx_appointments_deleted_at', 'idx_appointments_status', 'idx_appointments_scheduled_date', 'idx_appointments_vet_id', 'idx_appointments_patient_id',
      'idx_patient_conditions_deleted_at', 'idx_patient_conditions_patient_id',
      'idx_patient_tutors_deleted_at', 'idx_patient_tutors_client_id',
      'idx_patients_deleted_at', 'idx_patients_name', 'idx_patients_color_id', 'idx_patients_breed_id', 'idx_patients_species_id',
      'idx_antiparasitics_deleted_at', 'idx_vaccines_deleted_at', 'idx_colors_deleted_at',
      'idx_breeds_deleted_at', 'idx_breeds_species_id', 'idx_species_deleted_at',
      'idx_refresh_tokens_deleted_at', 'idx_refresh_tokens_user_id',
      'idx_clients_deleted_at', 'idx_employees_deleted_at', 'idx_users_deleted_at', 'idx_persons_deleted_at', 'idx_roles_deleted_at',
    ];
    for (const idx of generalIndexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${idx}`);
    }

    // ── Drop unique indexes ──
    const uniqueIndexes = [
      'uq_encounter_active_by_queue_live', 'uq_encounter_active_by_patient_live',
      'uq_queue_entries_appointment_live', 'uq_appointments_vet_slot_live',
      'uq_patients_tutor_primary_live', 'uq_patients_microchip_live', 'uq_patients_code_live',
      'uq_antiparasitics_name_live', 'uq_vaccines_name_live', 'uq_colors_name_live',
      'uq_breeds_species_name_live', 'uq_species_name_live',
      'uq_clients_person_live', 'uq_employees_code_live', 'uq_employees_person_live',
      'uq_users_email_live', 'uq_users_person_live', 'uq_persons_document_live', 'uq_roles_name_live',
    ];
    for (const idx of uniqueIndexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${idx}`);
    }

    // ── Drop deleted_by_user_id FKs ──
    const deletedByFks: Array<{ table: string; constraint: string }> = [
      { table: 'media_files', constraint: 'fk_media_files_deleted_by' },
      { table: 'procedures', constraint: 'fk_procedures_deleted_by' },
      { table: 'surgeries', constraint: 'fk_surgeries_deleted_by' },
      { table: 'deworming_events', constraint: 'fk_deworming_events_deleted_by' },
      { table: 'vaccination_events', constraint: 'fk_vaccination_events_deleted_by' },
      { table: 'treatment_items', constraint: 'fk_treatment_items_deleted_by' },
      { table: 'treatments', constraint: 'fk_treatments_deleted_by' },
      { table: 'encounter_plans', constraint: 'fk_encounters_plan_deleted_by' },
      { table: 'encounter_clinical_impressions', constraint: 'fk_encounters_impression_deleted_by' },
      { table: 'encounter_environmental_data', constraint: 'fk_encounters_env_deleted_by' },
      { table: 'encounter_clinical_exams', constraint: 'fk_encounters_exam_deleted_by' },
      { table: 'encounter_anamnesis', constraint: 'fk_encounters_anamnesis_deleted_by' },
      { table: 'encounter_consultation_reasons', constraint: 'fk_encounters_reason_deleted_by' },
      { table: 'encounters', constraint: 'fk_encounters_deleted_by' },
      { table: 'queue_entries', constraint: 'fk_queue_entries_deleted_by' },
      { table: 'appointments', constraint: 'fk_appointments_deleted_by' },
      { table: 'patient_conditions', constraint: 'fk_patient_conditions_deleted_by' },
      { table: 'patient_tutors', constraint: 'fk_patient_tutors_deleted_by' },
      { table: 'patients', constraint: 'fk_patients_deleted_by' },
      { table: 'antiparasitics', constraint: 'fk_antiparasitics_deleted_by' },
      { table: 'vaccines', constraint: 'fk_vaccines_deleted_by' },
      { table: 'colors', constraint: 'fk_colors_deleted_by' },
      { table: 'breeds', constraint: 'fk_breeds_deleted_by' },
      { table: 'species', constraint: 'fk_species_deleted_by' },
      { table: 'user_password_reset_tokens', constraint: 'fk_pwd_tokens_deleted_by' },
      { table: 'user_refresh_tokens', constraint: 'fk_refresh_tokens_deleted_by' },
      { table: 'clients', constraint: 'fk_clients_deleted_by' },
      { table: 'employees', constraint: 'fk_employees_deleted_by' },
      { table: 'users', constraint: 'fk_users_deleted_by' },
      { table: 'persons', constraint: 'fk_persons_deleted_by' },
      { table: 'roles', constraint: 'fk_roles_deleted_by' },
    ];
    for (const fk of deletedByFks) {
      await queryRunner.query(`ALTER TABLE ${fk.table} DROP CONSTRAINT IF EXISTS ${fk.constraint}`);
    }
  }
}
