package py.edu.uc.campus_backend.config;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named = "PRESENCE_TEST_DB", matches = "jdbc:postgresql://127\\.0\\.0\\.1:55433/tour_fluidity")
class SessionCookieIntegrationTest {
    @LocalServerPort private int port;
    @Autowired private ObjectMapper json;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    private HttpRequest.Builder request(String path, String cookie) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
            .timeout(Duration.ofSeconds(10)).header("Cookie", cookie);
    }
    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void badCookieRecoversCsrfAndReusesTheNewSession() throws Exception {
        var first = send(request("/api/auth/csrf", "JSESSIONID=AA=="));
        assertEquals(200, first.statusCode());
        assertNotNull(json.readTree(first.body()).get("token"));
        var setCookie = first.headers().allValues("set-cookie").stream()
            .filter(value -> value.startsWith("JSESSIONID=")).findFirst().orElseThrow();
        assertTrue(setCookie.contains("HttpOnly"));
        assertTrue(setCookie.contains("SameSite=Lax"));
        assertTrue(setCookie.contains("Max-Age=2592000"));
        var cookie = setCookie.split(";", 2)[0];
        var second = send(request("/api/auth/csrf", cookie));
        assertEquals(200, second.statusCode());
        assertTrue(second.headers().allValues("set-cookie").isEmpty(), "La sesión válida se conserva");
    }

    @Test void malformedSessionDoesNotGrantAccessOrBypassCsrf() throws Exception {
        assertEquals(401, send(request("/api/auth/me", "JSESSIONID=AA==")).statusCode());
        var login = request("/api/auth/login", "JSESSIONID=AA==").header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"correo\":\"nobody@example.invalid\",\"password\":\"invalid-password\"}"));
        assertEquals(403, send(login).statusCode());
    }

    @Test void loginAfterRecoveryReachesCredentialValidationInsteadOfServerError() throws Exception {
        var csrf = send(request("/api/auth/csrf", "JSESSIONID=AA=="));
        assertEquals(200, csrf.statusCode());
        var token = json.readTree(csrf.body());
        var cookie = csrf.headers().allValues("set-cookie").stream()
            .filter(value -> value.startsWith("JSESSIONID=")).findFirst().orElseThrow().split(";", 2)[0];
        var login = request("/api/auth/login", cookie).header("Content-Type", "application/json")
            .header(token.get("headerName").asText(), token.get("token").asText())
            .POST(HttpRequest.BodyPublishers.ofString("{\"correo\":\"nobody@example.invalid\",\"password\":\"invalid-password\"}"));
        var result = send(login);
        assertEquals(401, result.statusCode());
        assertEquals("Correo o contraseña incorrectos.", json.readTree(result.body()).get("mensaje").asText());
    }
}
