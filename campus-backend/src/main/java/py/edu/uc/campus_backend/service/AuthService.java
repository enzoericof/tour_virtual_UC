
package py.edu.uc.campus_backend.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

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

        return obtenerUsuario(authentication.getName());
    }

    public UsuarioResponse obtenerUsuario(String correo) {
        return usuarioRepository.findByCorreo(correo)
            .map(UsuarioResponse::desde)
            .orElseThrow();
    }
}
