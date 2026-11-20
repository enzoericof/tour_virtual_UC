package py.edu.uc.campus_backend.config;

import java.io.IOException;
import java.util.Arrays;
import java.util.EnumSet;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.SessionRepositoryFilter;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

@Configuration
public class SessionCookieConfig {
    @Bean
    FilterRegistrationBean<InvalidSessionCookieFilter> invalidSessionCookieFilter(CookieSerializer serializer) {
        var registration = new FilterRegistrationBean<>(new InvalidSessionCookieFilter(serializer));
        registration.setOrder(SessionRepositoryFilter.DEFAULT_ORDER - 1);
        registration.setDispatcherTypes(EnumSet.allOf(DispatcherType.class));
        return registration;
    }

    /** Una cookie ajena/vieja puede ser Base64 válido y decodificarse a NUL.
     * PostgreSQL rechaza ese carácter antes de que Spring detecte sesión vencida.
     * Se conserva el serializador y su configuración; solo se omite esa cookie.
     */
    static class InvalidSessionCookieFilter implements Filter {
        private final CookieSerializer serializer;

        InvalidSessionCookieFilter(CookieSerializer serializer) { this.serializer = serializer; }

        private boolean validIds(HttpServletRequest request) {
            return serializer.readCookieValues(request).stream()
                .allMatch(id -> id != null && !id.isBlank() && id.codePoints().noneMatch(Character::isISOControl));
        }

        private HttpServletRequest withCookies(HttpServletRequest request, Cookie[] cookies) {
            return new HttpServletRequestWrapper(request) {
                @Override public Cookie[] getCookies() { return cookies; }
            };
        }

        @Override
        public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            var httpRequest = (HttpServletRequest) request;
            if (validIds(httpRequest)) {
                chain.doFilter(request, response);
                return;
            }
            var cookies = Arrays.stream(httpRequest.getCookies())
                .filter(cookie -> validIds(withCookies(httpRequest, new Cookie[] { cookie })))
                .toArray(Cookie[]::new);
            // CSRF/inicio de sesión emitirán la cookie nueva con las opciones originales.
            // También se aplica al despacho de /error: Tomcat puede usar el request original.
            chain.doFilter(withCookies(httpRequest, cookies), response);
        }
    }
}
