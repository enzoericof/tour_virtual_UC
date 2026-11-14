package py.edu.uc.campus_backend.multiplayer;

import jakarta.servlet.http.HttpSession;
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

    public PresenceConfig(PresenceSocket presence) {
        this.presence = presence;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Spring solo acepta el mismo origen. El proxy de Vite conserva el origen del visitante.
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
        });
    }
}
