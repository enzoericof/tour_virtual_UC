package py.edu.uc.campus_backend.multiplayer;

import jakarta.servlet.http.HttpSession;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
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
import java.util.HashSet;
import java.util.Set;
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
        final String sessionId;
        final long userId;
        final String name;
        volatile Player player;
        volatile long lastSeen = System.nanoTime();
        long lastMovement;

        Peer(WebSocketSession socket, HttpSession http, long userId, String name) {
            this.socket = new ConcurrentWebSocketSessionDecorator(socket, 3000, 65536);
            this.sessionId = http.getId();
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

    public PresenceSocket(UsuarioService users, ObjectMapper json, PresenceStore store) {
        this.users = users;
        this.json = json;
        this.store = store;
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

    @Override
    protected void handleTextMessage(WebSocketSession socket, TextMessage message) throws IOException {
        Peer peer = peers.get(socket.getId());
        if (peer == null) return;
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
        Pose pose;
        try {
            pose = json.readValue(body, Pose.class);
        } catch (RuntimeException e) {
            // Un dato inválido no altera la presencia previa.
            return;
        }
        if (pose == null || !bounded(pose.x(), 10000) || !bounded(pose.y(), 55)
                || !bounded(pose.z(), 10000) || !bounded(pose.yaw(), Math.PI + 0.001)) return;
        peer.lastSeen = now;
        Player player = new Player(peer.id, peer.name, skins.getOrDefault(peer.userId, "azul"),
            pose.x(), pose.y(), pose.z(), pose.yaw(), pose.walking());
        if (peer.player == null && !store.enter(peer.id, peer.userId, peer.sessionId, player)) {
            socket.close(new CloseStatus(4001, "Recorrido completo: 10 jugadores"));
            return;
        }
        peer.player = player;
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
        List<Peer> local = new ArrayList<>(peers.values());
        List<PresenceStore.Update> updates = new ArrayList<>();
        for (Peer peer : local) {
            Player player = peer.player;
            if (player != null && now - peer.lastSeen <= INACTIVE) {
                updates.add(new PresenceStore.Update(peer.id, player));
            }
        }
        var exchange = store.exchange(updates, local.stream().map(peer -> peer.sessionId).toList());
        Set<String> missing = new HashSet<>();
        for (var update : updates) missing.add(update.id());
        for (var player : exchange.players()) missing.remove(player.id());
        List<Peer> connected = new ArrayList<>();
        for (Peer peer : local) {
            if (!exchange.sessions().contains(peer.sessionId) || now - peer.lastSeen > INACTIVE
                    || missing.contains(peer.id)) {
                peers.remove(peer.socket.getId(), peer);
                store.remove(peer.id);
                try {
                    // Si una instancia perdió su plaza durante una interrupción, el cliente vuelve a conectarse.
                    peer.socket.close(missing.contains(peer.id) ? CloseStatus.SERVER_ERROR : CloseStatus.POLICY_VIOLATION);
                } catch (IOException ignored) {}
                continue;
            }
            connected.add(peer);
        }
        List<Player> players = exchange.players();
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
