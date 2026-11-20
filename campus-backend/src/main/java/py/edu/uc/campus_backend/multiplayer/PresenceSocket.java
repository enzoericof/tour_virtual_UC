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
import java.util.LinkedHashMap;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PresenceSocket extends TextWebSocketHandler {
    public record Pose(Double x, Double y, Double z, Double yaw, boolean walking) {}
    public record Player(String id, String name, String skin, double x, double y, double z,
            double yaw, boolean walking, long at, boolean hidden) {
        public Player(String id, String name, String skin, double x, double y, double z,
                double yaw, boolean walking, long at) {
            this(id, name, skin, x, y, z, yaw, walking, at, false);
        }
        public Player(String id, String name, String skin, double x, double y, double z,
                double yaw, boolean walking) {
            this(id, name, skin, x, y, z, yaw, walking, System.currentTimeMillis());
        }
    }
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
        String lastSnapshot = "";
        long lastSent;

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
    private final SocialService social;
    private volatile PresenceStore.Exchange shared = new PresenceStore.Exchange(List.of(), Set.of());
    private final Set<String> departed = ConcurrentHashMap.newKeySet();
    private volatile long lastExchange;
    private volatile long lastChange;

    public PresenceSocket(UsuarioService users, ObjectMapper json, PresenceStore store, SocialService social) {
        this.users = users;
        this.json = json;
        this.store = store;
        this.social = social;
        social.bind(this::publishSocial,()->!peers.isEmpty());
    }

    private void publishSocial(List<String> recipients, Object event) {
        var tree = (tools.jackson.databind.node.ObjectNode) json.valueToTree(event);
        tree.put("serverNow", System.currentTimeMillis());
        String payload = json.writeValueAsString(tree);
        long now = System.nanoTime();
        for (Peer peer : peers.values()) {
            if (peer.player == null || peer.player.hidden() || now - lastExchange > 5_000_000_000L
                || !shared.sessions().contains(peer.sessionId) || now - peer.lastSeen > INACTIVE
                || (!recipients.isEmpty() && !recipients.contains(peer.id))) continue;
            try { peer.socket.sendMessage(new TextMessage(payload)); }
            catch (IOException | RuntimeException e) { departed.add(peer.id); }
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession socket) throws IOException {
        socket.setTextMessageSizeLimit(4096);
        Principal principal = socket.getPrincipal();
        if (principal == null || !(socket.getAttributes().get("httpSession") instanceof HttpSession session)) {
            socket.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        try {
            var user = users.obtenerActivo(principal.getName());
            skins.putIfAbsent(user.getId(), AvatarColor.forUser(user.getId()));
            peers.put(socket.getId(), new Peer(socket, session, user.getId(), user.getNombre() + " " + user.getApellido()));
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
        if (body.startsWith("{")) {
            try {
                var command = json.readTree(body);
                if (command.has("type")) {
                    if (peer.player != null && !peer.player.hidden() && shared.sessions().contains(peer.sessionId)
                        && now - lastExchange <= 5_000_000_000L) {
                        peer.lastSeen = now;
                        social.handle(peer.id, peer.userId, peer.name, command);
                    }
                    return;
                }
            } catch (RuntimeException ignored) { return; }
        }
        if (body.equals("join")) {
            peer.lastSeen = now;
            if (peer.player == null) {
                Player reservation = new Player(peer.id, peer.name, skins.getOrDefault(peer.userId, "azul"),
                    0, 0, 0, 0, false, System.currentTimeMillis(), true);
                if (!store.enter(peer.id, peer.userId, peer.sessionId, reservation)) {
                    socket.close(new CloseStatus(4001, "Recorrido completo: 10 jugadores"));
                    return;
                }
                peer.player = reservation;
                lastChange = now;
            }
            peer.socket.sendMessage(new TextMessage("{\"admitted\":true}"));
            return;
        }
        if (body.equals("hide")) {
            peer.lastSeen = now;
            Player p = peer.player;
            if (p != null) {
                peer.player = new Player(p.id(), p.name(), p.skin(), p.x(), p.y(), p.z(), p.yaw(),
                    false, System.currentTimeMillis(), true);
                lastChange = now;
            }
            return;
        }
        if (body.equals("ping") || body.equals("leave")) {
            peer.lastSeen = now;
            if (body.equals("leave")) {
                peer.player = null;
                store.remove(peer.id); // Una salida explícita, nunca por cada movimiento.
                lastChange = now;
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
        lastChange = now;
    }

    private static boolean bounded(Double value, double max) {
        return value != null && Double.isFinite(value) && Math.abs(value) <= max;
    }

    // PostgreSQL queda en otro hilo: nunca frena los mensajes del recorrido.
    @Scheduled(fixedDelay = 200, scheduler = "presenceSync")
    public void synchronizePresence() {
        if (peers.isEmpty() && departed.isEmpty()) return;
        long now = System.nanoTime();
        boolean remoteMoving = shared.players().stream().anyMatch(p -> p.walking()
            || System.currentTimeMillis() - p.at() < 1000);
        if (departed.isEmpty() && !remoteMoving && now - lastChange > 1_000_000_000L
                && now - lastExchange < 2_000_000_000L) return;
        List<Peer> local = new ArrayList<>(peers.values());
        for (String id : List.copyOf(departed)) {
            store.remove(id);
            departed.remove(id);
        }
        if (local.isEmpty()) { shared = new PresenceStore.Exchange(List.of(), Set.of()); return; }
        List<PresenceStore.Update> updates = new ArrayList<>();
        for (Peer peer : local) {
            Player player = peer.player;
            if (player != null && now - peer.lastSeen <= INACTIVE) {
                updates.add(new PresenceStore.Update(peer.id, player));
            }
        }
        var exchange = store.exchange(updates, local.stream().map(peer -> peer.sessionId).toList());
        shared = exchange;
        lastExchange = System.nanoTime();
        Set<String> missing = new HashSet<>();
        for (var update : updates) missing.add(update.id());
        for (var player : exchange.players()) missing.remove(player.id());
        for (Peer peer : local) {
            if (!exchange.sessions().contains(peer.sessionId) || now - peer.lastSeen > INACTIVE
                    || (peer.player != null && missing.contains(peer.id))) {
                peers.remove(peer.socket.getId(), peer);
                departed.add(peer.id);
                try {
                    // Si una instancia perdió su plaza durante una interrupción, el cliente vuelve a conectarse.
                    peer.socket.close(missing.contains(peer.id) ? CloseStatus.SERVER_ERROR : CloseStatus.POLICY_VIOLATION);
                } catch (IOException ignored) {}
                continue;
            }
        }
    }

    @Scheduled(fixedDelay = 100, scheduler = "presencePublish")
    public void publish() {
        if (peers.isEmpty()) return;
        long now = System.nanoTime();
        // Una caída de la base no mantiene indefinidamente una sesión sin validar.
        if (now - lastExchange > 5_000_000_000L) return;
        var exchange = shared;
        Map<String, Player> visible = new LinkedHashMap<>();
        for (var player : exchange.players()) {
            if (!departed.contains(player.id())) visible.put(player.id(), player);
        }
        List<Peer> connected = new ArrayList<>(peers.values());
        for (Peer peer : connected) {
            visible.remove(peer.id);
            if (peer.player != null && now - peer.lastSeen <= INACTIVE
                    && exchange.sessions().contains(peer.sessionId)) {
                Player p = peer.player;
                visible.put(peer.id, new Player(p.id(), p.name(), skins.getOrDefault(peer.userId, p.skin()),
                    p.x(), p.y(), p.z(), p.yaw(), p.walking(), p.at(), p.hidden()));
            }
        }
        List<Player> players = new ArrayList<>(visible.values());
        players.removeIf(Player::hidden); // La vista general reserva cupo sin dibujar un avatar fantasma.
        players.sort(java.util.Comparator.comparing(Player::id));
        for (Peer peer : connected) {
            try {
                if (!exchange.sessions().contains(peer.sessionId)) continue;
                String payload = json.writeValueAsString(new Snapshot(peer.id, players));
                if (payload.equals(peer.lastSnapshot) && now - peer.lastSent < 5_000_000_000L) continue;
                peer.socket.sendMessage(new TextMessage(payload));
                peer.lastSnapshot = payload;
                peer.lastSent = now;
            } catch (IOException | RuntimeException e) {
                peers.remove(peer.socket.getId(), peer);
                departed.add(peer.id);
                try { peer.socket.close(CloseStatus.SERVER_ERROR); } catch (IOException ignored) {}
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession socket, CloseStatus status) {
        Peer peer = peers.remove(socket.getId());
        if (peer != null) departed.add(peer.id);
    }
}
