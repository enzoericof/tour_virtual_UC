package py.edu.uc.campus_backend.multiplayer;
import jakarta.servlet.http.HttpSession;
import java.lang.reflect.Proxy;
import java.security.Principal;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.*;
import py.edu.uc.campus_backend.model.Usuario;
import py.edu.uc.campus_backend.service.UsuarioService;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class PresenceSocketTest {
    static class Store extends PresenceStore {
        int exchanges, admissions, removals;
        boolean available = true;
        PresenceSocket.Player reserved;
        Function<List<Update>, Exchange> answer = updates -> new Exchange(updates.stream().map(Update::pose).toList(), Set.of("session"));
        Store() { super(null, null); }
        @Override public boolean enter(String id, long uid, String sid, PresenceSocket.Player p) { admissions++; reserved = p; return available; }
        @Override public Exchange exchange(List<Update> updates, List<String> ids) { exchanges++; return answer.apply(updates); }
        @Override public void remove(String id) { removals++; }
    }
    private final Store store = new Store();
    private final List<TextMessage> sent = new CopyOnWriteArrayList<>();
    private int closed;
    private CloseStatus closeStatus;
    private final HttpSession session = (HttpSession) Proxy.newProxyInstance(HttpSession.class.getClassLoader(), new Class<?>[]{HttpSession.class},
        (proxy, method, args) -> method.getName().equals("getId") ? "session" : null);
    private final WebSocketSession socket = (WebSocketSession) Proxy.newProxyInstance(WebSocketSession.class.getClassLoader(), new Class<?>[]{WebSocketSession.class},
        (proxy, method, args) -> switch (method.getName()) {
            case "getId" -> "socket";
            case "getPrincipal" -> (Principal) () -> "test@example.invalid";
            case "getAttributes" -> Map.of("httpSession", session);
            case "isOpen" -> true;
            case "sendMessage" -> { sent.add((TextMessage) args[0]); yield null; }
            case "close" -> { closed++; closeStatus = (CloseStatus) args[0]; yield null; }
            case "getTextMessageSizeLimit", "getBinaryMessageSizeLimit" -> 512;
            case "hashCode" -> System.identityHashCode(proxy);
            case "equals" -> proxy == args[0];
            case "toString" -> "TestSocket";
            default -> null;
        });
    private final UsuarioService users = new UsuarioService(null, null) {
        @Override public Usuario obtenerActivo(String correo) {
            return new Usuario() {
                @Override public Long getId() { return 1L; }
                @Override public String getNombre() { return "Prueba"; }
            };
        }
    };
    private final PresenceSocket handler = new PresenceSocket(users, new ObjectMapper(), store);
    private void connect() throws Exception {
        handler.afterConnectionEstablished(socket); move(0); handler.synchronizePresence();
    }
    private void move(double x) throws Exception {
        handler.handleTextMessage(socket, new TextMessage("{\"x\":" + x + ",\"y\":0,\"z\":0,\"yaw\":0,\"walking\":" + (x != 0) + "}"));
    }
    @Test void fullTourRejectsJoinBeforeAcknowledgingOrMoving() throws Exception {
        store.available = false;
        handler.afterConnectionEstablished(socket);
        handler.handleTextMessage(socket, new TextMessage("join"));
        assertEquals(4001, closeStatus.getCode());
        assertEquals(1, store.admissions);
        assertTrue(sent.isEmpty());
    }
    @Test void joinReservesOneSlotAndOverviewKeepsItWithoutVisibleAvatar() throws Exception {
        handler.afterConnectionEstablished(socket);
        handler.handleTextMessage(socket, new TextMessage("join"));
        handler.handleTextMessage(socket, new TextMessage("join"));
        assertEquals(1, store.admissions);
        assertTrue(store.reserved.hidden());
        assertEquals("{\"admitted\":true}", sent.getFirst().getPayload());
        handler.synchronizePresence(); handler.publish();
        assertTrue(sent.getLast().getPayload().contains("\"players\":[]"));
        move(2); handler.synchronizePresence(); handler.publish();
        assertTrue(sent.getLast().getPayload().contains("\"x\":2.0"));
        handler.handleTextMessage(socket, new TextMessage("hide"));
        handler.synchronizePresence(); handler.publish();
        assertTrue(sent.getLast().getPayload().contains("\"players\":[]"));
        assertEquals(0, store.removals);
        handler.handleTextMessage(socket, new TextMessage("leave"));
        assertEquals(1, store.removals);
    }
    @Test void slowDatabaseDoesNotBlockFreshLocalMovementOrFloodMessages() throws Exception {
        connect(); handler.publish(); sent.clear();
        var entered = new CountDownLatch(1); var release = new CountDownLatch(1);
        store.answer = updates -> {
            entered.countDown();
            try { assertTrue(release.await(3, TimeUnit.SECONDS)); }
            catch (InterruptedException e) { throw new RuntimeException(e); }
            return new PresenceStore.Exchange(List.of(), Set.of("session"));
        };
        var sync = CompletableFuture.runAsync(handler::synchronizePresence);
        try {
            assertTrue(entered.await(1, TimeUnit.SECONDS)); Thread.sleep(50);
            move(2); handler.publish(); handler.publish();
            assertEquals(1, sent.size());
            assertTrue(sent.getFirst().getPayload().contains("\"x\":2.0"));
            assertEquals(1, store.admissions);
        } finally { release.countDown(); sync.get(2, TimeUnit.SECONDS); }
    }
    @Test void stationaryVisitorsDoNotQueryDatabaseOnEveryTimerTick() throws Exception {
        connect(); Thread.sleep(1100); store.exchanges = 0;
        for (int i = 0; i < 10; i++) handler.synchronizePresence();
        assertEquals(0, store.exchanges);
    }
    @Test void revocationClosesSocketAndLastDisconnectIsRemovedWithoutOtherVisitors() throws Exception {
        connect(); store.answer = updates -> new PresenceStore.Exchange(List.of(), Set.of());
        handler.synchronizePresence(); assertEquals(1, closed);
        handler.synchronizePresence(); assertEquals(1, store.removals);
    }
}
