package py.edu.uc.campus_backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import py.edu.uc.campus_backend.dto.RegistroRequest;
import py.edu.uc.campus_backend.dto.UsuarioResponse;
import py.edu.uc.campus_backend.model.Usuario;
import py.edu.uc.campus_backend.repository.UsuarioRepository;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public long cambiarSkin(String correo, String skin) {
        var usuario = obtenerActivo(correo);
        usuario.setSkin(skin);
        return usuario.getId();
    }

    @Transactional(readOnly = true)
    public Usuario obtenerActivo(String correo) {
        Usuario usuario = usuarioRepository.findByCorreo(correo)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "El usuario de la sesión ya no existe."));
        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta está desactivada.");
        }
        if (!Short.valueOf((short) 1).equals(usuario.getRol()) && !usuario.esAdministrador()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El rol de la cuenta no es válido.");
        }
        return usuario;
    }

    @Transactional
    public UsuarioResponse registrar(RegistroRequest request) {

        String correo = request.correo().trim().toLowerCase();

        if (usuarioRepository.existsByCorreo(correo)) {
            throw new IllegalArgumentException(
                "Ya existe una cuenta con ese correo."
            );
        }

        Usuario usuario = new Usuario();

        usuario.setNombre(request.nombre().trim());
        usuario.setApellido(request.apellido().trim());
        usuario.setCorreo(correo);
        usuario.setPassword(
            passwordEncoder.encode(request.password())
        );

        usuario.setRol((short) 1);
        usuario.setCarrera(request.carrera());

        Usuario guardado = usuarioRepository.save(usuario);

        return new UsuarioResponse(
            guardado.getId(),
            guardado.getNombre(),
            guardado.getApellido(),
            guardado.getCorreo(),
            guardado.getRol(),
            guardado.getCarrera(),
            guardado.getSkin()
        );
    }
}
