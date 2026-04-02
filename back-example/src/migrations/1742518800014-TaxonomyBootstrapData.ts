import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaxonomyBootstrapData1742518800014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO zootecnical_groups (name, description, is_active)
      SELECT data.name, data.description, true
      FROM (
        VALUES
          ('Canino', 'Grupo zootécnico de caninos'),
          ('Felino', 'Grupo zootécnico de felinos'),
          ('Bovino', 'Grupo zootécnico de bovinos'),
          ('Ovino', 'Grupo zootécnico de ovinos'),
          ('Caprino', 'Grupo zootécnico de caprinos'),
          ('Equino', 'Grupo zootécnico de equinos'),
          ('Porcino', 'Grupo zootécnico de porcinos'),
          ('Aves', 'Grupo zootécnico de aves'),
          ('Exóticos', 'Grupo zootécnico de animales exóticos'),
          ('Otros', 'Grupo zootécnico genérico')
      ) AS data(name, description)
      WHERE NOT EXISTS (
        SELECT 1 FROM zootecnical_groups zg WHERE LOWER(zg.name) = LOWER(data.name)
      )
    `);

    await queryRunner.query(`
      UPDATE species
      SET zootecnical_group_id = zg.id
      FROM zootecnical_groups zg
      WHERE (
        (LOWER(species.name) = LOWER('Perro') AND LOWER(zg.name) = LOWER('Canino'))
        OR (LOWER(species.name) = LOWER('Gato') AND LOWER(zg.name) = LOWER('Felino'))
        OR (LOWER(species.name) = LOWER('Otro') AND LOWER(zg.name) = LOWER('Otros'))
      )
    `);

    await queryRunner.query(`
      INSERT INTO species (zootecnical_group_id, name, description, is_active)
      SELECT zg.id, data.name, data.description, true
      FROM (
        VALUES
          ('Canino', 'Perro', 'Canino doméstico'),
          ('Felino', 'Gato', 'Felino doméstico'),
          ('Bovino', 'Bovino', 'Ganado bovino de producción y compañía'),
          ('Ovino', 'Oveja', 'Especie ovina'),
          ('Caprino', 'Cabra', 'Especie caprina'),
          ('Equino', 'Caballo', 'Especie equina'),
          ('Porcino', 'Cerdo', 'Especie porcina'),
          ('Aves', 'Pollo', 'Ave de corral'),
          ('Aves', 'Gallina', 'Ave ponedora'),
          ('Exóticos', 'Conejo', 'Lagomorfo de compañía y producción'),
          ('Exóticos', 'Hurón', 'Mustélido doméstico'),
          ('Otros', 'Otro', 'Otras especies atendidas')
      ) AS data(group_name, name, description)
      INNER JOIN zootecnical_groups zg ON LOWER(zg.name) = LOWER(data.group_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM species s WHERE LOWER(s.name) = LOWER(data.name)
      )
    `);

    await queryRunner.query(`
      INSERT INTO breeds (species_id, name, description, is_active)
      SELECT s.id, data.name, data.description, true
      FROM (
        VALUES
          ('Perro', 'Labrador Retriever', 'Raza canina de compañía'),
          ('Perro', 'Pastor Alemán', 'Raza canina de trabajo'),
          ('Perro', 'Bulldog Francés', 'Raza canina braquicéfala'),
          ('Perro', 'Poodle', 'Raza canina de compañía'),
          ('Gato', 'Siamés', 'Raza felina oriental'),
          ('Gato', 'Persa', 'Raza felina de pelo largo'),
          ('Gato', 'Maine Coon', 'Raza felina grande'),
          ('Bovino', 'Holstein', 'Raza bovina lechera'),
          ('Bovino', 'Brahman', 'Raza bovina cebuina'),
          ('Oveja', 'Merino', 'Raza ovina lanera'),
          ('Cabra', 'Saanen', 'Raza caprina lechera'),
          ('Caballo', 'Criollo', 'Raza equina de trabajo'),
          ('Cerdo', 'Landrace', 'Raza porcina de producción'),
          ('Pollo', 'Broiler', 'Línea de carne'),
          ('Gallina', 'Leghorn', 'Línea ponedora'),
          ('Conejo', 'Neozelandés', 'Raza cunícola común')
      ) AS data(species_name, name, description)
      INNER JOIN species s ON LOWER(s.name) = LOWER(data.species_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM breeds b WHERE b.species_id = s.id AND LOWER(b.name) = LOWER(data.name)
      )
    `);

    await queryRunner.query(`
      INSERT INTO colors (name, is_active)
      SELECT data.name, true
      FROM (
        VALUES
          ('Negro'),
          ('Blanco'),
          ('Marrón'),
          ('Gris'),
          ('Dorado'),
          ('Café'),
          ('Beige'),
          ('Atigrado'),
          ('Tricolor'),
          ('Bicolor'),
          ('Carey'),
          ('Crema'),
          ('Canela'),
          ('Manchado')
      ) AS data(name)
      WHERE NOT EXISTS (
        SELECT 1 FROM colors c WHERE LOWER(c.name) = LOWER(data.name)
      )
    `);

    await queryRunner.query(`
      INSERT INTO vaccines (name, species_id, is_revaccination, is_active)
      SELECT data.name, s.id, data.is_revaccination, true
      FROM (
        VALUES
          ('Triple Canina', 'Perro', false),
          ('Antirrábica Canina', 'Perro', false),
          ('Séxtuple Canina', 'Perro', false),
          ('Parvovirus Canino Refuerzo', 'Perro', true),
          ('Triple Felina', 'Gato', false),
          ('Antirrábica Felina', 'Gato', false),
          ('Leucemia Felina', 'Gato', false),
          ('Clostridial Bovina', 'Bovino', false),
          ('Carbunco Sintomático', 'Bovino', false),
          ('Enterotoxemia Ovina', 'Oveja', false),
          ('Newcastle', 'Pollo', false),
          ('Viruela Aviar', 'Gallina', false)
      ) AS data(name, species_name, is_revaccination)
      INNER JOIN species s ON LOWER(s.name) = LOWER(data.species_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM vaccines v WHERE LOWER(v.name) = LOWER(data.name) AND v.species_id = s.id
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM vaccines
      WHERE name IN (
        'Triple Canina', 'Antirrábica Canina', 'Séxtuple Canina', 'Parvovirus Canino Refuerzo',
        'Triple Felina', 'Antirrábica Felina', 'Leucemia Felina',
        'Clostridial Bovina', 'Carbunco Sintomático', 'Enterotoxemia Ovina',
        'Newcastle', 'Viruela Aviar'
      )
    `);

    await queryRunner.query(`
      DELETE FROM breeds
      WHERE name IN (
        'Labrador Retriever', 'Pastor Alemán', 'Bulldog Francés', 'Poodle',
        'Siamés', 'Persa', 'Maine Coon', 'Holstein', 'Brahman', 'Merino',
        'Saanen', 'Criollo', 'Landrace', 'Broiler', 'Leghorn', 'Neozelandés'
      )
    `);

    await queryRunner.query(`
      DELETE FROM species
      WHERE name IN ('Bovino', 'Oveja', 'Cabra', 'Caballo', 'Cerdo', 'Pollo', 'Gallina', 'Conejo', 'Hurón')
    `);

    await queryRunner.query(`
      DELETE FROM colors
      WHERE name IN ('Tricolor', 'Bicolor', 'Carey', 'Crema', 'Canela', 'Manchado')
    `);
  }
}
