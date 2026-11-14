
package py.edu.uc.campus_backend.controller;

import java.util.Map;
import java.util.Set;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.core.Authentication;
import py.edu.uc.campus_backend.multiplayer.PresenceSocket;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import py.edu.uc.campus_backend.dto.LoginRequest;
import py.edu.uc.campus_backend.dto.RegistroRequest;
import py.edu.uc.campus_backend.dto.UsuarioResponse;
import py.edu.uc.campus_backend.service.AuthService;
import py.edu.uc.campus_backend.service.UsuarioService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;
    private final AuthService authService;
    private final PresenceSocket presence;

    private final HttpSessionSecurityContextRepository securityContextRepository =
        new HttpSessionSecurityContextRepository();

    public AuthController(
            UsuarioService usuarioService,
            AuthService authService, PresenceSocket presence) {
        this.usuarioService = usuarioService;
        this.authService = authService;
        this.presence = presence;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }

    @PutMapping("/skin")
    public ResponseEntity<?> skin(@RequestBody Map<String, String> request, Authentication authentication) {
        String skin = request.get("skin");
        if (skin == null || !Set.of("azul", "verde", "terracota", "violeta").contains(skin)) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Elegí una apariencia disponible."));
        }
        long id = usuarioService.cambiarSkin(authentication.getName(), skin);
        presence.updateSkin(id, skin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registrar(
            @Valid @RequestBody RegistroRequest request) {

        try {
            UsuarioResponse respuesta = usuarioService.registrar(request);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(respuesta);

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(Map.of("mensaje", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        try {
            UsuarioResponse usuario = authService.login(request);

            if (httpRequest.getSession(false) != null) httpRequest.changeSessionId();
            securityContextRepository.saveContext(
                SecurityContextHolder.getContext(),
                httpRequest,
                httpResponse
            );

            return ResponseEntity.ok(usuario);

        } catch (AuthenticationException e) {
            SecurityContextHolder.clearContext();

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("mensaje", "Correo o contraseña incorrectos."));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> obtenerUsuarioAutenticado(
            org.springframework.security.core.Authentication authentication) {

        if (authentication == null ||
            !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(
            authService.obtenerUsuario(authentication.getName())
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {

        HttpSession session = request.getSession(false);

        SecurityContextHolder.clearContext();

        if (session != null) {
            session.invalidate();
        }

        return ResponseEntity.ok(
            Map.of("mensaje", "Sesión cerrada correctamente.")
        );
}
}
