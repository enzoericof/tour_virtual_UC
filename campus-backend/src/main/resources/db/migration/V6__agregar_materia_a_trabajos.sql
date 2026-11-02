ALTER TABLE trabajos
    ADD COLUMN materia_id BIGINT;

ALTER TABLE trabajos
    ADD CONSTRAINT fk_trabajos_materia
    FOREIGN KEY (materia_id)
    REFERENCES materias(id);

CREATE INDEX idx_trabajos_materia_id
    ON trabajos(materia_id);