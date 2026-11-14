ALTER TABLE usuarios ADD COLUMN skin VARCHAR(16) NOT NULL DEFAULT 'azul';
ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_skin CHECK (skin IN ('azul', 'verde', 'terracota', 'violeta'));
