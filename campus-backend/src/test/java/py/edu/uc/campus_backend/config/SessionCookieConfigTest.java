package py.edu.uc.campus_backend.config;

import java.util.Base64;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.web.http.DefaultCookieSerializer;
import static org.junit.jupiter.api.Assertions.*;

class SessionCookieConfigTest {
    private final DefaultCookieSerializer serializer = new DefaultCookieSerializer();

    SessionCookieConfigTest() { serializer.setCookieName("JSESSIONID"); }

    private String encoded(String id) {
        return Base64.getEncoder().encodeToString(id.getBytes(StandardCharsets.UTF_8));
    }

    @Test void ignoresDecodedControlCharactersAndPreservesAValidSessionAndOtherCookies() throws Exception {
        var request = new MockHttpServletRequest();
        var valid = new Cookie("JSESSIONID", encoded(UUID.randomUUID().toString()));
        var other = new Cookie("preferencia", "azul");
        request.setCookies(new Cookie("JSESSIONID", "AA=="), valid, other);
        assertTrue(serializer.readCookieValues(request).getFirst().contains("\0"), "Reproduce el ID que PostgreSQL rechaza");
        var filter = new SessionCookieConfig.InvalidSessionCookieFilter(serializer);
        filter.doFilter(request, new MockHttpServletResponse(), (filtered, response) -> {
            var cookies = ((HttpServletRequest) filtered).getCookies();
            assertArrayEquals(new Cookie[] { valid, other }, cookies);
            assertEquals(1, serializer.readCookieValues((HttpServletRequest) filtered).size());
        });
    }

    @Test void leavesValidAndMissingSessionCookiesUntouched() throws Exception {
        var filter = new SessionCookieConfig.InvalidSessionCookieFilter(serializer);
        for (boolean hasCookie : new boolean[] { false, true }) {
            var request = new MockHttpServletRequest();
            if (hasCookie) request.setCookies(new Cookie("JSESSIONID", encoded(UUID.randomUUID().toString())));
            filter.doFilter(request, new MockHttpServletResponse(), (filtered, response) -> assertSame(request, filtered));
        }
    }

    @Test void honorsTheConfiguredCookieNameAndTheDefaultDecoding() throws Exception {
        serializer.setCookieName("CAMPUS_LOCAL_SESSION");
        var request = new MockHttpServletRequest();
        var unrelated = new Cookie("JSESSIONID", "AA==");
        request.setCookies(unrelated, new Cookie("CAMPUS_LOCAL_SESSION", encoded("invalid\nidentifier")));
        new SessionCookieConfig.InvalidSessionCookieFilter(serializer).doFilter(request, new MockHttpServletResponse(),
            (filtered, response) -> assertArrayEquals(new Cookie[] { unrelated }, ((HttpServletRequest) filtered).getCookies()));
    }
}
