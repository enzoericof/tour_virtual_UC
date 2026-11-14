package py.edu.uc.campus_backend.dto;
  
public record UsuarioResponse(
    Long id,
    String nombre,
    String apellido,
    String correo,
    Short rol,
    Short carrera,
    String skin
) {}