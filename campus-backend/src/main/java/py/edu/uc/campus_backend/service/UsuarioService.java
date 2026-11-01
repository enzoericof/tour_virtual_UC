package py.edu.uc.campus_backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
            guardado.getCarrera()
        );
    }
}