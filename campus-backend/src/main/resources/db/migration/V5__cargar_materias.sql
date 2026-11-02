-- Fuente: mallas curriculares 2016 aportadas por el equipo.
-- Carrera 1: Ingeniería Informática.
-- Carrera 2: Ingeniería Electrónica.
-- Se consideran compartidas las materias de igual nombre
-- presentes en ambas mallas.

-- =========================================================
-- 1. Materias compartidas por ambas carreras
-- =========================================================

WITH nuevas AS (
    INSERT INTO materias (nombre)
    VALUES
        ('Introducción a la Ingeniería'),
        ('Álgebra'),
        ('Geometría Analítica'),
        ('Trigonometría'),
        ('Lógica Matemática'),
        ('Misterio Cristiano 1'),
        ('Cálculo 1'),
        ('Álgebra Vectorial'),
        ('Introducción a la Física'),
        ('Introducción a la Informática'),
        ('Introducción a la Algoritmia'),
        ('Misterio Cristiano 2'),
        ('Cálculo 2'),
        ('Álgebra Lineal'),
        ('Física 1'),
        ('Teoría y Aplicación de la Informática 1'),
        ('Antropología Cristiana'),
        ('Cálculo 3'),
        ('Ecuaciones Diferenciales'),
        ('Física 2'),
        ('Lenguajes de Programación 1'),
        ('Ética Fundamental'),
        ('Física 3'),
        ('Historia y Filosofía de las Ciencias'),
        ('Ética Personal'),
        ('Estadística'),
        ('Ética Social 1'),
        ('Redes de Computadoras 1'),
        ('Investigación de Operaciones'),
        ('Ética Social 2'),
        ('Redes de Computadoras 2'),
        ('Ética Profesional'),
        ('Organización de Empresas'),
        ('Teoría y Aplicación de la Informática 2'),
        ('Economía Industrial'),
        ('Proyecto Final')
    RETURNING id
)
INSERT INTO materias_carreras (materia_id, carrera)
SELECT nuevas.id, carreras.carrera
FROM nuevas
CROSS JOIN (
    VALUES (1::SMALLINT), (2::SMALLINT)
) AS carreras(carrera);

-- =========================================================
-- 2. Materias exclusivas de Ingeniería Informática
-- =========================================================

WITH nuevas AS (
    INSERT INTO materias (nombre)
    VALUES
        ('Matemática para Informáticos'),
        ('Lenguajes de Programación 2'),
        ('Sistemas Operativos 1'),
        ('Arquitectura de Sistemas'),
        ('Lenguajes de Programación 3'),
        ('Base de Datos'),
        ('Sistemas Operativos 2'),
        ('Cálculo Numérico'),
        ('Ingeniería del Software 1'),
        ('Informática 1'),
        ('Sistemas Paralelos y Distribuidos'),
        ('Ingeniería del Software 2'),
        ('Informática 2'),
        ('Compiladores'),
        ('Complementos de Informática'),
        ('Informática 3')
    RETURNING id
)
INSERT INTO materias_carreras (materia_id, carrera)
SELECT id, 1::SMALLINT
FROM nuevas;

-- =========================================================
-- 3. Materias exclusivas de Ingeniería Electrónica
-- =========================================================

WITH nuevas AS (
    INSERT INTO materias (nombre)
    VALUES
        ('Química General'),
        ('Teoría de Circuitos 1'),
        ('Matemática para Electrónicos'),
        ('Electromagnetismo'),
        ('Teoría de Circuitos 2'),
        ('Tecnologías Electrónicas'),
        ('Electrónica 1'),
        ('Sistemas Digitales 1'),
        ('Electrónica 2'),
        ('Sistemas Digitales 2'),
        ('Procesamiento Digital de Señales'),
        ('Proyecto con Microprocesadores 1'),
        ('Controles Automáticos'),
        ('Telecomunicaciones 1'),
        ('Electrónica 3'),
        ('Proyecto con Microprocesadores 2'),
        ('Telecomunicaciones 2'),
        ('Automatización')
    RETURNING id
)
INSERT INTO materias_carreras (materia_id, carrera)
SELECT id, 2::SMALLINT
FROM nuevas;