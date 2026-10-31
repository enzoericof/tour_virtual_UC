package py.edu.uc.tour.users;
import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;
@Service
public class UserService implements UserDetailsService {
 private final UserRepository users; private final PasswordEncoder encoder;
 public UserService(UserRepository users,PasswordEncoder encoder){this.users=users;this.encoder=encoder;}
 public static String normalize(String email){return email.trim().toLowerCase(Locale.ROOT);}
 @Override public UserDetails loadUserByUsername(String email){CampusUser u=require(email);return User.withUsername(u.getEmail()).password(u.getPasswordHash()).roles(u.getRole()).build();}
 public CampusUser require(String email){return users.findByEmail(normalize(email)).orElseThrow(()->new UsernameNotFoundException("Usuario no encontrado"));}
 @Transactional public CampusUser register(String name,String email,String password){String normalized=normalize(email);if(users.existsByEmail(normalized))throw new ResponseStatusException(HttpStatus.CONFLICT,"Ese correo ya está registrado.");if(password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"La contraseña excede 72 bytes.");return users.save(new CampusUser(name.trim(),normalized,encoder.encode(password),"USER"));}
}
