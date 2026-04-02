import { MigrationInterface, QueryRunner } from 'typeorm';

export class Triggers1742518800009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const updatedAtTables: Array<{ trigger: string; table: string }> = [
      { trigger: 'trg_roles_updated_at', table: 'roles' },
      { trigger: 'trg_persons_updated_at', table: 'persons' },
      { trigger: 'trg_users_updated_at', table: 'users' },
      { trigger: 'trg_employees_updated_at', table: 'employees' },
      { trigger: 'trg_clients_updated_at', table: 'clients' },
      { trigger: 'trg_species_updated_at', table: 'species' },
      { trigger: 'trg_breeds_updated_at', table: 'breeds' },
      { trigger: 'trg_colors_updated_at', table: 'colors' },
      { trigger: 'trg_vaccines_updated_at', table: 'vaccines' },
      { trigger: 'trg_antiparasitics_updated_at', table: 'antiparasitics' },
      { trigger: 'trg_patients_updated_at', table: 'patients' },
      { trigger: 'trg_patient_conditions_updated_at', table: 'patient_conditions' },
      { trigger: 'trg_appointments_updated_at', table: 'appointments' },
      { trigger: 'trg_queue_updated_at', table: 'queue_entries' },
      { trigger: 'trg_encounters_updated_at', table: 'encounters' },
      { trigger: 'trg_encounters_m_updated_at', table: 'encounter_consultation_reasons' },
      { trigger: 'trg_encounters_a_updated_at', table: 'encounter_anamnesis' },
      { trigger: 'trg_encounters_e_updated_at', table: 'encounter_clinical_exams' },
      { trigger: 'trg_encounters_d_updated_at', table: 'encounter_environmental_data' },
      { trigger: 'trg_encounters_i_updated_at', table: 'encounter_clinical_impressions' },
      { trigger: 'trg_encounters_p_updated_at', table: 'encounter_plans' },
      { trigger: 'trg_treatments_updated_at', table: 'treatments' },
      { trigger: 'trg_treatment_items_updated_at', table: 'treatment_items' },
      { trigger: 'trg_vaccinations_updated_at', table: 'vaccination_events' },
      { trigger: 'trg_deworming_updated_at', table: 'deworming_events' },
      { trigger: 'trg_surgeries_updated_at', table: 'surgeries' },
      { trigger: 'trg_procedures_updated_at', table: 'procedures' },
      { trigger: 'trg_media_files_updated_at', table: 'media_files' },
    ];

    for (const t of updatedAtTables) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS ${t.trigger} ON ${t.table}`);
      await queryRunner.query(`
        CREATE TRIGGER ${t.trigger}
        BEFORE UPDATE ON ${t.table}
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at()
      `);
    }

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_patients_validar_raza ON patients`);
    await queryRunner.query(`
      CREATE TRIGGER trg_patients_validar_raza
      BEFORE INSERT OR UPDATE ON patients
      FOR EACH ROW
      EXECUTE FUNCTION validar_raza_corresponde_especie()
    `);

    const softdeleteTables: Array<{ trigger: string; table: string }> = [
      { trigger: 'trg_roles_sd', table: 'roles' },
      { trigger: 'trg_persons_sd', table: 'persons' },
      { trigger: 'trg_users_sd', table: 'users' },
      { trigger: 'trg_employees_sd', table: 'employees' },
      { trigger: 'trg_clients_sd', table: 'clients' },
      { trigger: 'trg_refresh_tokens_sd', table: 'user_refresh_tokens' },
      { trigger: 'trg_pwd_tokens_sd', table: 'user_password_reset_tokens' },
      { trigger: 'trg_species_sd', table: 'species' },
      { trigger: 'trg_breeds_sd', table: 'breeds' },
      { trigger: 'trg_colors_sd', table: 'colors' },
      { trigger: 'trg_vaccines_sd', table: 'vaccines' },
      { trigger: 'trg_antiparasitics_sd', table: 'antiparasitics' },
      { trigger: 'trg_patients_sd', table: 'patients' },
      { trigger: 'trg_patient_tutors_sd', table: 'patient_tutors' },
      { trigger: 'trg_patient_conditions_sd', table: 'patient_conditions' },
      { trigger: 'trg_appointments_sd', table: 'appointments' },
      { trigger: 'trg_queue_sd', table: 'queue_entries' },
      { trigger: 'trg_encounters_sd', table: 'encounters' },
      { trigger: 'trg_encounters_m_sd', table: 'encounter_consultation_reasons' },
      { trigger: 'trg_encounters_a_sd', table: 'encounter_anamnesis' },
      { trigger: 'trg_encounters_e_sd', table: 'encounter_clinical_exams' },
      { trigger: 'trg_encounters_d_sd', table: 'encounter_environmental_data' },
      { trigger: 'trg_encounters_i_sd', table: 'encounter_clinical_impressions' },
      { trigger: 'trg_encounters_p_sd', table: 'encounter_plans' },
      { trigger: 'trg_treatments_sd', table: 'treatments' },
      { trigger: 'trg_treatment_items_sd', table: 'treatment_items' },
      { trigger: 'trg_vaccinations_sd', table: 'vaccination_events' },
      { trigger: 'trg_deworming_sd', table: 'deworming_events' },
      { trigger: 'trg_surgeries_sd', table: 'surgeries' },
      { trigger: 'trg_procedures_sd', table: 'procedures' },
      { trigger: 'trg_media_files_sd', table: 'media_files' },
    ];

    for (const t of softdeleteTables) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS ${t.trigger} ON ${t.table}`);
      await queryRunner.query(`
        CREATE TRIGGER ${t.trigger}
        BEFORE INSERT OR UPDATE ON ${t.table}
        FOR EACH ROW
        EXECUTE FUNCTION enforce_softdelete_consistency()
      `);
    }

    const validateSoftdeleteUserTables: Array<{ trigger: string; table: string }> = [
      { trigger: 'trg_roles_vsu', table: 'roles' },
      { trigger: 'trg_persons_vsu', table: 'persons' },
      { trigger: 'trg_users_vsu', table: 'users' },
      { trigger: 'trg_employees_vsu', table: 'employees' },
      { trigger: 'trg_clients_vsu', table: 'clients' },
      { trigger: 'trg_refresh_tokens_vsu', table: 'user_refresh_tokens' },
      { trigger: 'trg_pwd_tokens_vsu', table: 'user_password_reset_tokens' },
      { trigger: 'trg_species_vsu', table: 'species' },
      { trigger: 'trg_breeds_vsu', table: 'breeds' },
      { trigger: 'trg_colors_vsu', table: 'colors' },
      { trigger: 'trg_vaccines_vsu', table: 'vaccines' },
      { trigger: 'trg_antiparasitics_vsu', table: 'antiparasitics' },
      { trigger: 'trg_patients_vsu', table: 'patients' },
      { trigger: 'trg_patient_tutors_vsu', table: 'patient_tutors' },
      { trigger: 'trg_patient_conditions_vsu', table: 'patient_conditions' },
      { trigger: 'trg_appointments_vsu', table: 'appointments' },
      { trigger: 'trg_queue_vsu', table: 'queue_entries' },
      { trigger: 'trg_encounters_vsu', table: 'encounters' },
      { trigger: 'trg_encounters_m_vsu', table: 'encounter_consultation_reasons' },
      { trigger: 'trg_encounters_a_vsu', table: 'encounter_anamnesis' },
      { trigger: 'trg_encounters_e_vsu', table: 'encounter_clinical_exams' },
      { trigger: 'trg_encounters_d_vsu', table: 'encounter_environmental_data' },
      { trigger: 'trg_encounters_i_vsu', table: 'encounter_clinical_impressions' },
      { trigger: 'trg_encounters_p_vsu', table: 'encounter_plans' },
      { trigger: 'trg_treatments_vsu', table: 'treatments' },
      { trigger: 'trg_treatment_items_vsu', table: 'treatment_items' },
      { trigger: 'trg_vaccinations_vsu', table: 'vaccination_events' },
      { trigger: 'trg_deworming_vsu', table: 'deworming_events' },
      { trigger: 'trg_surgeries_vsu', table: 'surgeries' },
      { trigger: 'trg_procedures_vsu', table: 'procedures' },
      { trigger: 'trg_media_files_vsu', table: 'media_files' },
    ];

    for (const t of validateSoftdeleteUserTables) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS ${t.trigger} ON ${t.table}`);
      await queryRunner.query(`
        CREATE TRIGGER ${t.trigger}
        BEFORE INSERT OR UPDATE ON ${t.table}
        FOR EACH ROW
        EXECUTE FUNCTION validate_softdelete_user_reference()
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const allTables = [
      'roles', 'persons', 'users', 'employees', 'clients', 'user_refresh_tokens', 'user_password_reset_tokens',
      'species', 'breeds', 'colors', 'vaccines', 'antiparasitics', 'patients', 'patient_tutors', 'patient_conditions',
      'appointments', 'queue_entries', 'encounters', 'encounter_consultation_reasons', 'encounter_anamnesis',
      'encounter_clinical_exams', 'encounter_environmental_data', 'encounter_clinical_impressions', 'encounter_plans',
      'treatments', 'treatment_items', 'vaccination_events', 'deworming_events', 'surgeries', 'procedures', 'media_files'
    ];
    for (const table of allTables) {
      const alias = table.substring(0, 15);
      await queryRunner.query(`DROP TRIGGER IF EXISTS trg_${alias}_vsu ON ${table}`);
      await queryRunner.query(`DROP TRIGGER IF EXISTS trg_${alias}_sd ON ${table}`);
      await queryRunner.query(`DROP TRIGGER IF EXISTS trg_${alias}_updated_at ON ${table}`);
    }
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_patients_validar_raza ON patients`);
  }
}
