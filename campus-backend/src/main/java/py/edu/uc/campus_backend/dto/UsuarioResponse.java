package py.edu.uc.campus_backend.dto;

import py.edu.uc.campus_backend.model.Usuario;

public record UsuarioResponse(
    Long id,
    String nombre,
    String apellido,
    String correo,
    Short rol,
    Short carrera,
    String skin
) {
    public static UsuarioResponse desde(Usuario usuario) {
        return new UsuarioResponse(
            usuario.getId(),
            usuario.getNombre(),
            usuario.getApellido(),
            usuario.getCorreo(),
            usuario.getRol(),
            usuario.getCarrera(),
            usuario.getSkin()
        );
    }
}
