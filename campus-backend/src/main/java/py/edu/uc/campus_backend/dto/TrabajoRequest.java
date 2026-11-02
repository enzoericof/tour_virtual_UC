package py.edu.uc.campus_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record TrabajoRequest(

    @NotBlank(message = "El título es obligatorio.")
    @Size(
        max = 150,
        message = "El título no puede superar los 150 caracteres."
    )
    String titulo,

    @NotBlank(message = "La descripción es obligatoria.")
    String descripcion,

    @NotNull(message = "La materia es obligatoria.")
    @Positive(message = "El identificador de materia debe ser positivo.")
    Long materiaId

) {}
