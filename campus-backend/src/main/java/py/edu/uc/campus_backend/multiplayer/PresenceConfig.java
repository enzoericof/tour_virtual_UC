package py.edu.uc.campus_backend.multiplayer;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Configuration
@EnableWebSocket
@EnableScheduling
public class PresenceConfig implements WebSocketConfigurer {
    private final PresenceSocket presence;
    private final String[] frontendOrigins;

    public PresenceConfig(PresenceSocket presence,
            @Value("${CAMPUS_FRONTEND_ORIGINS:}") String[] frontendOrigins) {
        this.presence = presence;
        this.frontendOrigins = frontendOrigins;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(presence, "/ws/presence").addInterceptors(new HandshakeInterceptor() {
            @Override
            public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler handler, Map<String, Object> attributes) {
                if (!(request instanceof ServletServerHttpRequest servlet) || request.getPrincipal() == null) return false;
                HttpSession session = servlet.getServletRequest().getSession(false);
                if (session == null) return false;
                attributes.put("httpSession", session);
                return true;
            }

            @Override
            public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler handler, Exception failure) {
            }
        }).setAllowedOrigins(frontendOrigins);
    }
}
