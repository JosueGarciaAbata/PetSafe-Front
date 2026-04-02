import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedUsers1742518800011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        v_person_id INT;
        v_user_id INT;
        v_role_id INT;
      BEGIN
        INSERT INTO persons (person_type, first_name, last_name, document_id, phone, is_active)
        VALUES ('EMPLEADO', 'Admin', 'SafePet', '0000000001', '0000000000', true)
        RETURNING id INTO v_person_id;

        INSERT INTO users (person_id, email, password_hash, is_active)
        VALUES (
          v_person_id,
          'admin@safepet.com',
          crypt('Admin123!', gen_salt('bf', 10)),
          true
        )
        RETURNING id INTO v_user_id;

        INSERT INTO employees (person_id, code, job_title, is_vet, is_active)
        VALUES (v_person_id, 'EMP-001', 'Administrador', false, true);

        SELECT id INTO v_role_id FROM roles WHERE name = 'ADMIN' AND deleted_at IS NULL;
        IF v_role_id IS NOT NULL THEN
          INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_role_id);
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        v_person_id INT;
        v_user_id INT;
        v_role_id INT;
      BEGIN
        INSERT INTO persons (person_type, first_name, last_name, document_id, phone, is_active)
        VALUES ('CLIENTE', 'Cliente', 'De Prueba', '0000000002', '0000000001', true)
        RETURNING id INTO v_person_id;

        INSERT INTO users (person_id, email, password_hash, is_active)
        VALUES (
          v_person_id,
          'cliente@safepet.com',
          crypt('Cliente123!', gen_salt('bf', 10)),
          true
        )
        RETURNING id INTO v_user_id;

        INSERT INTO clients (person_id, notes, is_active)
        VALUES (v_person_id, 'Usuario de prueba', true);

        SELECT id INTO v_role_id FROM roles WHERE name = 'CLIENTE_APP' AND deleted_at IS NULL;
        IF v_role_id IS NOT NULL THEN
          INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_role_id);
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_roles
      WHERE user_id IN (
        SELECT u.id FROM users u WHERE u.email IN ('admin@safepet.com', 'cliente@safepet.com')
      )
    `);
    await queryRunner.query(`DELETE FROM employees WHERE person_id IN (SELECT id FROM persons WHERE document_id = '0000000001')`);
    await queryRunner.query(`DELETE FROM clients WHERE person_id IN (SELECT id FROM persons WHERE document_id = '0000000002')`);
    await queryRunner.query(`DELETE FROM users WHERE email IN ('admin@safepet.com', 'cliente@safepet.com')`);
    await queryRunner.query(`DELETE FROM persons WHERE document_id IN ('0000000001', '0000000002')`);
  }
}
