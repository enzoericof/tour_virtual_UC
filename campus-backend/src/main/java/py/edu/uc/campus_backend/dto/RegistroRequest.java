package py.edu.uc.campus_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegistroRequest(

    @NotBlank
    @Size(max = 100)
    String nombre,

    @NotBlank
    @Size(max = 100)
    String apellido,

    @NotBlank
    @Email
    @Size(max = 150)
    String correo,

    @NotBlank
    @Size(min = 8, max = 100)
    String password,

    @NotNull
    @Min(1)
    @Max(2)
    Short carrera

) {}