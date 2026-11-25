-- Recuperación del cambio histórico ya aplicado a la base compartida.
-- Definiciones contrastadas con su esquema: ambas columnas admiten NULL y no tienen valor por defecto.
ALTER TABLE archivos_trabajo
    ADD COLUMN IF NOT EXISTS tipo_contenido VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT;

ALTER TABLE archivos_trabajo
    ADD CONSTRAINT chk_archivos_trabajo_tamano_bytes
        CHECK (tamano_bytes IS NULL OR tamano_bytes > 0),
    ADD CONSTRAINT chk_archivos_trabajo_tipo_contenido
        CHECK (tipo_contenido IS NULL OR length(trim(tipo_contenido)) > 0);
