package py.edu.uc.tour.security;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import py.edu.uc.tour.users.*;
@Component
public class AdminBootstrap implements CommandLineRunner {
 private final UserRepository users;private final PasswordEncoder encoder;private final String email,password;
 public AdminBootstrap(UserRepository users,PasswordEncoder encoder,@Value("${app.admin.email}") String email,@Value("${app.admin.password}") String password){this.users=users;this.encoder=encoder;this.email=email;this.password=password;}
 public void run(String...args){if(email.isBlank()&&password.isBlank())return;if(email.isBlank()||password.length()<12||password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw new IllegalArgumentException("Definí ADMIN_EMAIL y ADMIN_PASSWORD de 12 caracteres como mínimo, hasta 72 bytes.");if(!users.existsByEmail(UserService.normalize(email)))users.save(new CampusUser("Administración",UserService.normalize(email),encoder.encode(password),"ADMIN"));}
}
