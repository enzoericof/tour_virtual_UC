
package py.edu.uc.campus_backend.service;

import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import py.edu.uc.campus_backend.model.Usuario;
import py.edu.uc.campus_backend.repository.UsuarioRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public CustomUserDetailsService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String correo)
            throws UsernameNotFoundException {

        Usuario usuario = usuarioRepository.findByCorreo(
            correo.trim().toLowerCase()
        ).orElseThrow(() ->
            new UsernameNotFoundException("Usuario no encontrado.")
        );

        String autoridad;

        if (usuario.getRol() == 1) {
            autoridad = "ROLE_ESTUDIANTE";
        } else if (usuario.getRol() == 2) {
            autoridad = "ROLE_ADMIN";
        } else {
            throw new UsernameNotFoundException("Rol de usuario inválido.");
        }

        return User.builder()
            .username(usuario.getCorreo())
            .password(usuario.getPassword())
            .authorities(List.of(
                new SimpleGrantedAuthority(autoridad)
            ))
            .disabled(!Boolean.TRUE.equals(usuario.getActivo()))
            .build();
    }
}
