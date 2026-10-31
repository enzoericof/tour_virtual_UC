package py.edu.uc.tour.users;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import jakarta.servlet.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;
import java.util.Map;
@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
 private final UserService users;private final AuthenticationManager manager;private final SecurityContextRepository repository;
 public AuthController(UserService users,AuthenticationManager manager,SecurityContextRepository repository){this.users=users;this.manager=manager;this.repository=repository;}
 public record Registration(@NotBlank @Size(max=80) String name,@NotBlank @Email @Size(max=180) String email,@NotBlank @Size(min=10,max=72) String password){}
 public record Credentials(@NotBlank @Email String email,@NotBlank @Size(max=72) String password){}
 public record UserView(Long id,String name,String email,String role){public static UserView of(CampusUser u){return new UserView(u.getId(),u.getName(),u.getEmail(),u.getRole());}}
 @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token){return Map.of("token",token.getToken(),"headerName",token.getHeaderName());}
 @PostMapping("/register") @ResponseStatus(org.springframework.http.HttpStatus.CREATED) public UserView register(@Valid @RequestBody Registration r){return UserView.of(users.register(r.name(),r.email(),r.password()));}
 @PostMapping("/login") public UserView login(@Valid @RequestBody Credentials c,HttpServletRequest request,HttpServletResponse response){Authentication auth=manager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(UserService.normalize(c.email()),c.password()));if(request.getSession(false)!=null)request.changeSessionId();var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(auth);SecurityContextHolder.setContext(context);repository.saveContext(context,request,response);new HttpSessionCsrfTokenRepository().saveToken(null,request,response);return UserView.of(users.require(auth.getName()));}
 @GetMapping("/me") public UserView me(Authentication auth){return UserView.of(users.require(auth.getName()));}
}
