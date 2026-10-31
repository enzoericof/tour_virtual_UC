package py.edu.uc.tour.security;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.context.*;
import org.springframework.http.HttpMethod;
@Configuration @EnableMethodSecurity
public class SecurityConfig {
 @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder(12);}
 @Bean SecurityContextRepository contextRepository(){return new HttpSessionSecurityContextRepository();}
 @Bean AuthenticationManager authenticationManager(UserDetailsService users,PasswordEncoder encoder){var provider=new DaoAuthenticationProvider(users);provider.setPasswordEncoder(encoder);return new ProviderManager(provider);}
 @Bean SecurityFilterChain filterChain(HttpSecurity http,SecurityContextRepository repository) throws Exception {
  http.csrf(c->c.csrfTokenRequestHandler(new org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler())).securityContext(c->c.securityContextRepository(repository))
   .authorizeHttpRequests(a->a.requestMatchers("/api/v1/auth/csrf","/api/v1/auth/register","/api/v1/auth/login","/api/v1/health").permitAll()
    .requestMatchers(HttpMethod.GET,"/api/v1/panels","/api/v1/works").permitAll()
    .requestMatchers("/api/**","/ws/**","/ws").authenticated().anyRequest().permitAll())
   .exceptionHandling(e->e.authenticationEntryPoint((q,r,x)->r.sendError(401)).accessDeniedHandler((q,r,x)->r.sendError(403)))
   .logout(l->l.logoutUrl("/api/v1/auth/logout").logoutSuccessHandler((q,r,a)->r.setStatus(204)).deleteCookies("JSESSIONID"));
  return http.build();
 }
}
