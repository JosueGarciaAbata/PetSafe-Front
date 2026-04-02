import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClinicalSeedData1742518800017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    
    // 1. ELIMINAR LAS VACUNAS DE PRUEBA DE LA MIGRACIÓN ANTERIOR (Limpiar el canvas)
    // Aquellas del Bootstrap que no sean profesionales. Las borramos para reemplazarlas.
    await queryRunner.query(`
      DELETE FROM vaccines 
      WHERE name IN (
        'Triple Canina', 'Antirrábica Canina', 'Séxtuple Canina', 'Parvovirus Canino Refuerzo',
        'Triple Felina', 'Antirrábica Felina', 'Leucemia Felina'
      )
    `);

    // 2. SEED PROFUNDO DE VACUNAS - ESQUEMAS REALES POR ESPECIE
    await queryRunner.query(`
      INSERT INTO vaccines (name, species_id, is_revaccination, is_mandatory, dose_order, is_active)
      SELECT data.name, s.id, data.is_revaccination, data.is_mandatory, data.dose_order, true
      FROM (
        VALUES
          -- ESQUEMA CANINO (PERROS)
          ('Puppy DP (Parvovirus/Distemper) - 1ra Dosis', 'Perro', false, true, 1),
          ('Puppy DP (Parvovirus/Distemper) - 2da Dosis', 'Perro', false, true, 2),
          ('Múltiple Canina (Sextuple/Octúple) - 1ra Dosis', 'Perro', false, true, 1),
          ('Múltiple Canina (Sextuple/Octúple) - 2da Dosis', 'Perro', false, true, 2),
          ('Múltiple Canina (Sextuple/Octúple) - 3ra Dosis', 'Perro', false, true, 3),
          ('Múltiple Canina - Refuerzo Anual', 'Perro', true, true, NULL),
          ('Antirrábica Canina - 1ra Dosis', 'Perro', false, true, 1),
          ('Antirrábica Canina - Refuerzo Anual', 'Perro', true, true, NULL),
          ('KC (Traqueobronquitis/Tos de las perreras) - 1ra Dosis', 'Perro', false, false, 1),
          ('KC (Traqueobronquitis/Tos de las perreras) - Refuerzo Anual', 'Perro', true, false, NULL),
          ('Giardia Canina - Única Dosis', 'Perro', false, false, 1),
          ('Lyme Canina - 1ra Dosis', 'Perro', false, false, 1),
          ('Lyme Canina - 2da Dosis', 'Perro', false, false, 2),
          ('Lyme Canina - Refuerzo Anual', 'Perro', true, false, NULL),
          ('Leptospirosis Cepa Adicional', 'Perro', false, false, NULL),
          
          -- ESQUEMA FELINO (GATOS)
          ('Triple Felina (Rinotraqueítis/Calicivirus/Panleucopenia) - 1ra Dosis', 'Gato', false, true, 1),
          ('Triple Felina (Rinotraqueítis/Calicivirus/Panleucopenia) - 2da Dosis', 'Gato', false, true, 2),
          ('Triple Felina (Rinotraqueítis/Calicivirus/Panleucopenia) - 3ra Dosis', 'Gato', false, true, 3),
          ('Triple Felina - Refuerzo Anual', 'Gato', true, true, NULL),
          ('Leucemia Felina (Test Negativo Previo) - 1ra Dosis', 'Gato', false, false, 1),
          ('Leucemia Felina - 2da Dosis', 'Gato', false, false, 2),
          ('Leucemia Felina - Refuerzo Anual', 'Gato', true, false, NULL),
          ('Antirrábica Felina - 1ra Dosis', 'Gato', false, true, 1),
          ('Antirrábica Felina - Refuerzo Anual', 'Gato', true, true, NULL),
          ('PIF (Peritonitis Infecciosa Felina) Intranasal', 'Gato', false, false, NULL),
          
          -- ESQUEMA CONEJOS Y HURONES
          ('Mixomatosis y Enfermedad Hemorrágica Viral', 'Conejo', false, true, 1),
          ('Mixomatosis y EHV - Refuerzo Anual', 'Conejo', true, true, NULL),
          ('Moquillo para Hurones', 'Hurón', false, true, 1),
          ('Moquillo Hurón - Refuerzo Anual', 'Hurón', true, true, NULL),
          ('Rabia para Hurones', 'Hurón', false, true, 1)

      ) AS data(name, species_name, is_revaccination, is_mandatory, dose_order)
      INNER JOIN species s ON LOWER(s.name) = LOWER(data.species_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM vaccines v WHERE LOWER(v.name) = LOWER(data.name) AND v.species_id = s.id
      )
    `);

    // 3. SEED PROFUNDO DE PROCEDIMIENTOS CLÍNICOS Y DIAGNÓSTICOS
    await queryRunner.query(`
      INSERT INTO procedure_catalog (name, description, is_active)
      SELECT data.name, data.description, true
      FROM (
        VALUES
          ('Consulta General Diurna', 'Revisión física estándar de rutina o por enfermedad leve.'),
          ('Consulta General Nocturna / Emergencia', 'Atención médica fuera de horario regular o urgencia vital.'),
          ('Consulta de Especialidad - Cardiología', 'Evaluación integral por cardiólogo veterinario.'),
          ('Consulta de Especialidad - Dermatología', 'Revisión dermatológica con toma de muestras básicas.'),
          ('Consulta de Especialidad - Oncología', 'Evaluación de tumores, estadificación y plan de quimioterapia.'),
          ('Corte de Uñas', 'Recorte preventivo de tejido córneo.'),
          ('Limpieza de Oídos (Otic)', 'Lavado ótico rutinario o pre-tratamiento.'),
          ('Vaciado de Glándulas Anales', 'Expresión manual de los sacos anales.'),
          ('Hemograma Completo (CBC)', 'Análisis de sangre para evaluar serie roja, blanca y plaquetas.'),
          ('Perfil Bioquímico (12 Parámetros)', 'Evaluación metabólica básica (hígado, riñón, glucosa).'),
          ('Perfil Bioquímico (24 Parámetros)', 'Evaluación metabólica integral avanzada.'),
          ('Urianálisis Completo', 'Análisis físico, químico y sedimento urinario.'),
          ('Coproparasitoscópico (Flotación/Directo)', 'Examen de heces para búsqueda de parásitos gastrointestinales.'),
          ('Ecografía Abdominal Completa', 'Ultrasonido rastreo de cavidad abdominal.'),
          ('Ecografía FAST (Emergencias)', 'Evaluación rápida de líquido libre en abdomen/tórax.'),
          ('Ecocardiograma', 'Ultrasonido cardíaco con Doppler.'),
          ('Radiografía Torácica (2 Vistas)', 'Rayos X de tórax lateral y ventrodorsal.'),
          ('Radiografía Ortopédica (Posicionamiento)', 'Rayos X de huesos largos/articulaciones con anestesia/sedación leve.'),
          ('Electrocardiograma (ECG)', 'Registro de la actividad eléctrica del corazón.'),
          ('Toma de Presión Arterial (Doppler/Oscilométrico)', 'Medición de la presión sanguínea.'),
          ('Colocación de Vía Intravenosa', 'Categorización y canalización de vena periférica.'),
          ('Fluidoterapia Intravenosa (x Hora)', 'Administración de fluidos en bomba de infusión durante 1 hr.'),
          ('Oxigenoterapia (x Hora)', 'Manejo en cámara de oxígeno o mascarilla.'),
          ('Curación de Herida Simple', 'Asepsia, debridación menor y vendaje.'),
          ('Drenaje de Absceso Superficial', 'Apertura, lavado y colocación de dren.'),
          ('Raspado Cutáneo (Búsqueda de Ácaros)', 'Toma de muestra profunda de piel para microscopía.'),
          ('Test Rápido SNAP 4Dx Plus', 'Detección de Gusano del Corazón, Lyme, Ehrlichia y Anaplasma.'),
          ('Test Rápido ViF/ViLeF (Gatos)', 'Inmunodeficiencia y Leucemia Felina.'),
          ('Test Rápido Parvovirus/Coronavirus', 'Prueba inmunocromatográfica en heces.'),
          ('Transfusión Sanguínea (Sangre Entera)', 'Procedimiento de transfusión con tipeo previo.'),
          ('RCP (Reanimación Cardiopulmonar) Avanzada', 'Maniobras de rescate vital.')
      ) AS data(name, description)
      WHERE NOT EXISTS (
        SELECT 1 FROM procedure_catalog pc WHERE LOWER(pc.name) = LOWER(data.name)
      )
    `);

    // 4. SEED PROFUNDO DE CIRUGÍAS
    await queryRunner.query(`
      INSERT INTO surgery_catalog (name, description, requires_anesthesia, is_active)
      SELECT data.name, data.description, data.anesthesia, true
      FROM (
        VALUES
          ('Ovariohisterectomía (OVH) Canina (< 10kg)', 'Castración hembra perro pequeña, retiro de útero y ovarios.', true),
          ('Ovariohisterectomía (OVH) Canina (10-25kg)', 'Castración hembra perro mediana.', true),
          ('Ovariohisterectomía (OVH) Canina (> 25kg)', 'Castración hembra perro grande.', true),
          ('Ovariohisterectomía (OVH) Felina', 'Castración hembra gata.', true),
          ('Orquiectomía (Castración) Canina (< 10kg)', 'Castración macho perro pequeño.', true),
          ('Orquiectomía (Castración) Canina (10-25kg)', 'Castración macho perro mediano.', true),
          ('Orquiectomía (Castración) Canina (> 25kg)', 'Castración macho perro grande.', true),
          ('Orquiectomía (Castración) Felina', 'Castración macho gato.', true),
          ('Piómetra (Cirugía de Emergencia)', 'Extirpación de útero infectado. Riesgo alto de sepsis.', true),
          ('Profilaxis Dental (Limpieza Ultrasónica)', 'Destartraje por ultrasonido y pulido. Requiere anestesia general leve.', true),
          ('Extracción Dental (Múltiple/Molar)', 'Odontosección y cierre de colgajo.', true),
          ('Enucleación Ocular', 'Extirpación quirúrgica del globo ocular por glaucoma o trauma severo.', true),
          ('Corrección de Entropión / Ectropión', 'Cirugía plástica de los párpados.', true),
          ('Resolución de Otohematoma', 'Drenaje y sutura de pabellón auricular.', true),
          ('Esplenectomía', 'Extirpación del bazo, comúnmente por hemangiosarcoma o torsión.', true),
          ('Cistotomía (Extracción de Cálculos)', 'Apertura de vejiga urinaria para remoción de urolitos.', true),
          ('Enterotomía (Cuerpo Extraño)', 'Incisión en intestino para extraer objetos.', true),
          ('Enterectomía (Resección Intestinal)', 'Corte y anastomosis de intestino necrosado.', true),
          ('Gastrotomía', 'Incisión en estómago para extracción de cuerpos extraños gástricos.', true),
          ('Gastropexia Preventiva', 'Fijación del estómago a pared abdominal para evitar torsión (GDV).', true),
          ('Torsión Gástrica (GDV) Resolución de Emergencia', 'Cirugía crítica de descompresión y reposicionamiento.', true),
          ('Herniorrafia Umbilical', 'Reparación de defecto en pared abdominal ventral.', true),
          ('Herniorrafia Inguinal / Perineal', 'Reparación pélvica/inguinal compleja.', true),
          ('Mastectomía Parcial', 'Resección de cadena mamaria por neoplasia (solo una sección).', true),
          ('Mastectomía Radical Unilateral', 'Resección completa de la cadena mamaria.', true),
          ('Amputación de Miembro', 'Amputación total del miembro afectado por trauma severo u osteosarcoma.', true),
          ('Reducción de Luxación Patelar', 'Cirugía ortopédica correctiva de rodilla.', true),
          ('Cirugía de TPLO (Ruptura Ligamento Cruzado)', 'Osteotomía niveladora de la meseta tibial.', true),
          ('Sutura de Laceración Mayor (> 10cm)', 'Reparación de músculo y piel bajo anestesia por trauma.', true)
      ) AS data(name, description, anesthesia)
      WHERE NOT EXISTS (
        SELECT 1 FROM surgery_catalog sc WHERE LOWER(sc.name) = LOWER(data.name)
      )
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Si queremos hacer un rollback de todos los inserts
    await queryRunner.query(`DELETE FROM vaccines WHERE name LIKE 'Puppy DP%' OR name LIKE 'Múltiple Canina%' OR name LIKE 'Triple Felina%' OR name LIKE '%Refuerzo Anual%'`);
    
    // El catálogo de procedimientos
    await queryRunner.query(`DELETE FROM procedure_catalog WHERE description LIKE '%Rutinario%' OR name LIKE 'Consulta%'`);
    
    // El catálogo de cirugías
    await queryRunner.query(`DELETE FROM surgery_catalog WHERE name LIKE 'Ovario%' OR name LIKE 'Orquiecto%'`);
  }
}
