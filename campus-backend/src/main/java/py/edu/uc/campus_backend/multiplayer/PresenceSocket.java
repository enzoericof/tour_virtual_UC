package py.edu.uc.campus_backend.multiplayer;

import jakarta.servlet.http.HttpSession;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import py.edu.uc.campus_backend.service.UsuarioService;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PresenceSocket extends TextWebSocketHandler {
    public record Pose(Double x, Double y, Double z, Double yaw, boolean walking) {}
    public record Player(String id, String name, String skin, double x, double y, double z,
            double yaw, boolean walking) {}
    private record Snapshot(String self, List<Player> players) {}

    private static class Peer {
        final String id = UUID.randomUUID().toString();
        final WebSocketSession socket;
        final HttpSession http;
        final long userId;
        final String name;
        volatile Player player;
        volatile long lastSeen = System.nanoTime();
        long lastMovement;

        Peer(WebSocketSession socket, HttpSession http, long userId, String name) {
            this.socket = new ConcurrentWebSocketSessionDecorator(socket, 3000, 65536);
            this.http = http;
            this.userId = userId;
            this.name = name;
        }
    }

    private static final long INACTIVE = 20_000_000_000L;
    private final Map<String, Peer> peers = new ConcurrentHashMap<>();
    private final Map<Long, String> skins = new ConcurrentHashMap<>();
    private final UsuarioService users;
    private final ObjectMapper json;
    private final PresenceStore store;
    private final JdbcIndexedSessionRepository sessions;

    public PresenceSocket(UsuarioService users, ObjectMapper json, PresenceStore store,
            JdbcIndexedSessionRepository sessions) {
        this.users = users;
        this.json = json;
        this.store = store;
        this.sessions = sessions;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession socket) throws IOException {
        socket.setTextMessageSizeLimit(512);
        Principal principal = socket.getPrincipal();
        if (principal == null || !(socket.getAttributes().get("httpSession") instanceof HttpSession session)) {
            socket.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        try {
            var user = users.obtenerActivo(principal.getName());
            skins.putIfAbsent(user.getId(), user.getSkin());
            peers.put(socket.getId(), new Peer(socket, session, user.getId(), user.getNombre()));
        } catch (RuntimeException e) {
            socket.close(CloseStatus.POLICY_VIOLATION);
        }
    }

    private boolean authenticated(Peer peer) {
        try {
            org.springframework.session.Session session = sessions.findById(peer.http.getId());
            if (session == null) return false;
            Object context = session.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
            return context instanceof SecurityContext security && security.getAuthentication() != null
                && security.getAuthentication().isAuthenticated()
                && security.getAuthentication().getName().equals(peer.socket.getPrincipal().getName());
        } catch (IllegalStateException e) {
            return false; // Sesión caducada o cerrada.
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession socket, TextMessage message) {
        Peer peer = peers.get(socket.getId());
        if (peer == null || !authenticated(peer)) return;
        long now = System.nanoTime();
        String body = message.getPayload();
        if (body.equals("ping") || body.equals("leave")) {
            peer.lastSeen = now;
            if (body.equals("leave")) {
                peer.player = null;
                store.remove(peer.id);
            }
            return;
        }
        if (now - peer.lastMovement < 45_000_000L) return;
        peer.lastMovement = now;
        try {
            Pose pose = json.readValue(body, Pose.class);
            if (pose == null || !bounded(pose.x(), 10000) || !bounded(pose.y(), 55)
                    || !bounded(pose.z(), 10000) || !bounded(pose.yaw(), Math.PI + 0.001)) return;
            peer.lastSeen = now;
            peer.player = new Player(peer.id, peer.name, skins.getOrDefault(peer.userId, "azul"),
                pose.x(), pose.y(), pose.z(), pose.yaw(), pose.walking());
            if (!store.save(peer.id, peer.userId, peer.http.getId(), peer.player)) {
                peer.player = null;
                socket.close(new CloseStatus(4001, "Recorrido completo: 10 jugadores"));
            }
        } catch (IOException e) {
            peers.remove(socket.getId(), peer);
            store.remove(peer.id);
        } catch (RuntimeException e) {
            // Un dato inválido no altera la presencia previa.
        }
    }

    private static boolean bounded(Double value, double max) {
        return value != null && Double.isFinite(value) && Math.abs(value) <= max;
    }

    public void updateSkin(long userId, String skin) {
        skins.put(userId, skin);
    }

    @Scheduled(fixedDelay = 100)
    public void publish() {
        if (peers.isEmpty()) return;
        long now = System.nanoTime();
        List<Peer> connected = new ArrayList<>();
        for (Peer peer : peers.values()) {
            if (!authenticated(peer) || now - peer.lastSeen > INACTIVE) {
                peers.remove(peer.socket.getId(), peer);
                store.remove(peer.id);
                try { peer.socket.close(CloseStatus.POLICY_VIOLATION); } catch (IOException ignored) {}
                continue;
            }
            connected.add(peer);
        }
        List<Player> players = store.players();
        for (Peer peer : connected) {
            try {
                peer.socket.sendMessage(new TextMessage(json.writeValueAsString(new Snapshot(peer.id, players))));
            } catch (IOException | RuntimeException e) {
                peers.remove(peer.socket.getId(), peer);
                store.remove(peer.id);
                try { peer.socket.close(CloseStatus.SERVER_ERROR); } catch (IOException ignored) {}
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession socket, CloseStatus status) {
        Peer peer = peers.remove(socket.getId());
        if (peer != null) store.remove(peer.id);
    }
}
