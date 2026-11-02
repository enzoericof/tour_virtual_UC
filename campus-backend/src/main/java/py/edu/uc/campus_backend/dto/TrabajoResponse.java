package py.edu.uc.campus_backend.dto;

import java.time.LocalDateTime;

public record TrabajoResponse(
    Long id,
    String titulo,
    String descripcion,
    Long usuarioId,
    Long materiaId,
    String materiaNombre,
    LocalDateTime fechaPublicacion,
    LocalDateTime fechaActualizacion
) {}
