import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProcedureSurgeryCatalogs1742518800016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── Catálogo de tipos de procedimiento ─────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS procedure_catalog (
        id           SERIAL PRIMARY KEY,
        name         varchar(120) NOT NULL,
        description  text,
        is_active    boolean NOT NULL DEFAULT true,
        created_at   timestamp without time zone NOT NULL DEFAULT now(),
        updated_at   timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at   timestamp without time zone,
        deleted_by_user_id int,
        CONSTRAINT fk_proc_cat_deleted_by FOREIGN KEY (deleted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT uq_procedure_catalog_name UNIQUE (name)
      )
    `);

    // ── Catálogo de tipos de cirugía ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS surgery_catalog (
        id                  SERIAL PRIMARY KEY,
        name                varchar(120) NOT NULL,
        description         text,
        requires_anesthesia boolean NOT NULL DEFAULT false,
        is_active           boolean NOT NULL DEFAULT true,
        created_at          timestamp without time zone NOT NULL DEFAULT now(),
        updated_at          timestamp without time zone NOT NULL DEFAULT now(),
        deleted_at          timestamp without time zone,
        deleted_by_user_id  int,
        CONSTRAINT fk_surg_cat_deleted_by FOREIGN KEY (deleted_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT uq_surgery_catalog_name UNIQUE (name)
      )
    `);

    // ── Agregar catalog_id a las tablas de eventos (nullable para no romper datos existentes)
    await queryRunner.query(`
      ALTER TABLE procedures
        ADD COLUMN IF NOT EXISTS catalog_id int,
        ADD CONSTRAINT fk_procedures_catalog FOREIGN KEY (catalog_id)
          REFERENCES procedure_catalog(id) ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE surgeries
        ADD COLUMN IF NOT EXISTS catalog_id int,
        ADD CONSTRAINT fk_surgeries_catalog FOREIGN KEY (catalog_id)
          REFERENCES surgery_catalog(id) ON DELETE RESTRICT
    `);

    // ── Índices ────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_procedure_catalog_active ON procedure_catalog(is_active) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_surgery_catalog_active   ON surgery_catalog(is_active)   WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_procedures_catalog_id   ON procedures(catalog_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_surgeries_catalog_id    ON surgeries(catalog_id)`);

    // ── Datos semilla básicos ───────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO procedure_catalog (name, description) VALUES
        ('Baño y secado',         'Servicio de baño, secado y cepillado básico'),
        ('Corte de pelo',         'Recorte o corte estético del pelaje'),
        ('Limpieza dental',       'Profilaxis dental con ultrasonido'),
        ('Radiografía',           'Placa radiográfica diagnóstica'),
        ('Ecografía',             'Ultrasonido diagnóstico abdominal o general'),
        ('Extracción dental',     'Extracción de pieza dental bajo sedación'),
        ('Limpieza de oídos',     'Limpieza y tratamiento del conducto auditivo'),
        ('Corte de uñas',         'Recorte de uñas en perros y gatos'),
        ('Vendaje / Cura',        'Curación y vendaje de heridas'),
        ('Citología',             'Toma de muestra citológica para análisis')
      ON CONFLICT (name) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO surgery_catalog (name, description, requires_anesthesia) VALUES
        ('Esterilización (OVH)',          'Ovario-histerectomía en hembras',              true),
        ('Orquiectomía',                  'Castración en machos',                         true),
        ('Cesárea',                       'Extracción quirúrgica de fetos',               true),
        ('Gastropexia',                   'Fijación del estómago para prevenir torsión',  true),
        ('Extracción de cuerpo extraño',  'Remoción quirúrgica de objeto ingerido',       true),
        ('Amputación de miembro',         'Amputación parcial o total de extremidad',     true),
        ('Cirugía de cataratas',          'Extracción del cristalino opacificado',        true),
        ('Enucleación ocular',            'Extracción del globo ocular',                  true),
        ('Herniorrафия',                  'Corrección quirúrgica de hernia',              true),
        ('Biopsia quirúrgica',            'Toma de muestra de tejido bajo anestesia',     true)
      ON CONFLICT (name) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE surgeries  DROP CONSTRAINT IF EXISTS fk_surgeries_catalog`);
    await queryRunner.query(`ALTER TABLE procedures DROP CONSTRAINT IF EXISTS fk_procedures_catalog`);
    await queryRunner.query(`ALTER TABLE surgeries  DROP COLUMN IF EXISTS catalog_id`);
    await queryRunner.query(`ALTER TABLE procedures DROP COLUMN IF EXISTS catalog_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS surgery_catalog CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS procedure_catalog CASCADE`);
  }
}
