import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedData1742518800010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles (name, is_active)
      VALUES
        ('ADMIN', true),
        ('MVZ', true),
        ('RECEPCIONISTA', true),
        ('CLIENTE_APP', true)
    `);

    await queryRunner.query(`
      INSERT INTO species (name, description, is_active)
      VALUES
        ('Perro', 'Caninos domésticos', true),
        ('Gato', 'Felinos domésticos', true),
        ('Otro', 'Otras especies atendidas', true)
    `);

    await queryRunner.query(`
      INSERT INTO colors (name, is_active)
      VALUES
        ('Negro', true),
        ('Blanco', true),
        ('Marrón', true),
        ('Gris', true),
        ('Dorado', true),
        ('Café', true),
        ('Beige', true),
        ('Atigrado', true)
    `);

    await queryRunner.query(`
      INSERT INTO vaccines (name, species, is_revaccination, is_active)
      VALUES
        ('Triple Canina', 'PERRO', false, true),
        ('Antirrábica Canina', 'PERRO', false, true),
        ('Séxtuple Canina', 'PERRO', false, true),
        ('Triple Felina', 'GATO', false, true),
        ('Antirrábica Felina', 'GATO', false, true)
    `);

    await queryRunner.query(`
      INSERT INTO antiparasitics (name, type, is_active)
      VALUES
        ('Albendazol', 'INTERNO', true),
        ('Fipronil', 'EXTERNO', true),
        ('Milbemicina + Praziquantel', 'MIXTO', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM antiparasitics WHERE name IN ('Albendazol', 'Fipronil', 'Milbemicina + Praziquantel')`);
    await queryRunner.query(`DELETE FROM vaccines WHERE name IN ('Triple Canina', 'Antirrábica Canina', 'Séxtuple Canina', 'Triple Felina', 'Antirrábica Felina')`);
    await queryRunner.query(`DELETE FROM colors WHERE name IN ('Negro', 'Blanco', 'Marrón', 'Gris', 'Dorado', 'Café', 'Beige', 'Atigrado')`);
    await queryRunner.query(`DELETE FROM species WHERE name IN ('Perro', 'Gato', 'Otro')`);
    await queryRunner.query(`DELETE FROM roles WHERE name IN ('ADMIN', 'MVZ', 'RECEPCIONISTA', 'CLIENTE_APP')`);
  }
}
