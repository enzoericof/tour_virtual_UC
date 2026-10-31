
package py.edu.uc.campus_backend.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import py.edu.uc.campus_backend.dto.LoginRequest;
import py.edu.uc.campus_backend.dto.UsuarioResponse;
import py.edu.uc.campus_backend.repository.UsuarioRepository;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;

    public AuthService(
            AuthenticationManager authenticationManager,
            UsuarioRepository usuarioRepository) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
    }

    public UsuarioResponse login(LoginRequest request) {
        String correo = request.correo().trim().toLowerCase();

        Authentication authentication =
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    correo,
                    request.password()
                )
            );

    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);

        var usuario = usuarioRepository.findByCorreo(
            authentication.getName()
        ).orElseThrow();

        return new UsuarioResponse(
            usuario.getId(),
            usuario.getNombre(),
            usuario.getApellido(),
            usuario.getCorreo(),
            usuario.getRol(),
            usuario.getCarrera()
        );
    }

    public UsuarioResponse obtenerUsuario(String correo) {
    var usuario = usuarioRepository.findByCorreo(correo)
        .orElseThrow();

    return new UsuarioResponse(
        usuario.getId(),
        usuario.getNombre(),
        usuario.getApellido(),
        usuario.getCorreo(),
        usuario.getRol(),
        usuario.getCarrera()
    );
}
}
