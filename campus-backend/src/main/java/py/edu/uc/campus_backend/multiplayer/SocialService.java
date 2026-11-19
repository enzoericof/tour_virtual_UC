package py.edu.uc.campus_backend.multiplayer;

import py.edu.uc.campus_backend.dto.SocialAction;

import py.edu.uc.campus_backend.dto.ChatMessage;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiConsumer;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class SocialService {
    private final RecentChat recent;
    private final ChatArchive archive;
    private final SocialActions actions;
    private final SocialRelay relay;
    private final ObjectMapper json;
    private final Map<Long, Long> lastChat = new ConcurrentHashMap<>();
    private final Map<String, Long> lastCommand = new ConcurrentHashMap<>();
    private BiConsumer<List<String>, Object> publisher = (ids, event) -> {};
    private volatile java.util.function.BooleanSupplier active=()->false;
    public SocialService(RecentChat recent, ChatArchive archive, SocialActions actions, SocialRelay relay, ObjectMapper json) {
        this.recent = recent; this.archive = archive; this.actions = actions; this.relay = relay; this.json = json;
        relay.listen(this::receive,()->active.getAsBoolean()||recent.hasPending());
    }
    public void bind(BiConsumer<List<String>, Object> publisher) { bind(publisher,()->true); }
    public void bind(BiConsumer<List<String>, Object> publisher,java.util.function.BooleanSupplier active) { this.publisher=publisher;this.active=active; }
    private void receive(JsonNode event,boolean local) {
        long now = System.currentTimeMillis();
        String type = event.path("type").asText();
        if (type.equals("chat.seed-request")) {
            if (relay.node.equals(event.path("node").asText())) return;
            for (var m : recent.recent(now)) relay.send(Map.of("type", "chat.seed", "node", event.path("node").asText(), "message", m));
            return;
        }
        if (type.equals("chat.seed")) {
            if (relay.node.equals(event.path("node").asText())) {
                var message=json.treeToValue(event.path("message"), ChatMessage.class);
                if(recent.add(message,now))publisher.accept(List.of(),Map.of("type","chat.recent","messages",List.of(message)));
            }
            return;
        }
        if (type.equals("chat.message")) {
            if(!local&&!active.getAsBoolean())return;
            var m = json.treeToValue(event.path("message"), ChatMessage.class);
            if (recent.add(m, now)) publisher.accept(List.of(), event);
        } else if(type.equals("social.impulse")) {
            publisher.accept(List.of(),event);
        } else if (type.equals("social.action")) {
            var a = json.treeToValue(event.path("action"), SocialAction.class);
            if((a.status().equals("active")||a.status().equals("pending"))&&a.expiresAt()<=now)return;
            publisher.accept(a.status().equals("pending") || a.status().equals("declined")
                ? List.of(a.from(), a.to()) : List.of(), event);
        }
    }
    public void handle(String id, long userId, String name, JsonNode command) {
        long now = System.currentTimeMillis();
        String type = command.path("type").asText();
        try {
            String bucket=id+":"+(type.equals("social.sync")?"sync":type.equals("chat.history")?"history":"action");
            Long previous = lastCommand.put(bucket, now);
            if (previous != null && now - previous < 150) throw new IllegalArgumentException("Esperá un momento antes de volver a enviar.");
            switch (type) {
                case "chat.send" -> {
                    String text = command.path("text").asText().strip();
                    if (text.isEmpty() || text.length() > 500 || text.chars().anyMatch(c -> Character.isISOControl(c) && c != '\n' && c != '\t'))
                        throw new IllegalArgumentException("Escribí un mensaje de 1 a 500 caracteres.");
                    lastChat.compute(userId,(key,last)->{
                        if(last!=null&&now-last<1000)throw new IllegalArgumentException("Podés enviar un mensaje por segundo.");
                        return now;
                    });
                    relay.send(Map.of("type", "chat.message", "message", new ChatMessage(java.util.UUID.randomUUID().toString(), userId, name, text, now)));
                }
                case "social.sync" -> {
                    publisher.accept(List.of(id), Map.of("type", "chat.recent", "messages", recent.recent(now)));
                    for (var a : actions.current(now)) {
                        if (a.status().equals("active") || id.equals(a.from()) || id.equals(a.to()))
                            publisher.accept(List.of(id), Map.of("type", "social.action", "action", a));
                    }
                }
                case "chat.history" -> {
                    long before = command.path("before").asLong(Long.MAX_VALUE);
                    String beforeId = command.path("beforeId").asText("ffffffff-ffff-ffff-ffff-ffffffffffff");
                    java.util.UUID.fromString(beforeId);
                    var page = archive.history(now - RecentChat.WINDOW, before, beforeId);
                    publisher.accept(List.of(id), Map.of("type", "chat.history", "messages", page.stream().limit(50).toList(), "more", page.size() > 50));
                }
                case "social.request" -> emit(actions.request(id, command.path("target").isTextual() ? command.path("target").asText() : null, command.path("kind").asText(), now));
                case "social.respond" -> emit(actions.respond(id, command.path("id").asText(), command.path("accept").asBoolean(), false, now));
                case "social.cancel" -> emit(actions.respond(id, command.path("id").asText(), false, true, now));
                case "social.impulse" -> {
                    String direction=command.path("direction").asText();
                    if(!java.util.Set.of("forward","back","left","right","up").contains(direction))
                        throw new IllegalArgumentException("Impulso inválido.");
                    String actionId=command.path("id").asText();
                    actions.requireRagdoll(id,actionId,now);
                    relay.send(Map.of("type","social.impulse","id",actionId,"direction",direction));
                }
                default -> throw new IllegalArgumentException("Acción desconocida.");
            }
        } catch (IllegalArgumentException e) {
            publisher.accept(List.of(id), Map.of("type", "social.error", "message", e.getMessage()));
        } catch (RuntimeException e) {
            LoggerFactory.getLogger(getClass()).warn("No se pudo procesar una acción social: {}", e.getMessage());
            publisher.accept(List.of(id), Map.of("type", "social.error", "message", "No se pudo completar. Reintentá en un momento."));
        }
    }
    private void emit(SocialAction action) { relay.send(Map.of("type", "social.action", "action", action)); }
    @Scheduled(fixedDelay = 1000, scheduler = "socialArchiveScheduler")
    public void maintain() {
        long now = System.currentTimeMillis();
        try { recent.archive(archive, now); }
        catch (RuntimeException e) { LoggerFactory.getLogger(getClass()).warn("El chat conserva en RAM los mensajes pendientes de archivo: {}", e.getMessage()); }
        lastChat.entrySet().removeIf(e -> now - e.getValue() > RecentChat.WINDOW);
        lastCommand.entrySet().removeIf(e -> now - e.getValue() > RecentChat.WINDOW);
        try { if(active.getAsBoolean()){for (var a : actions.expire(now)) emit(a); actions.clean(now);} }
        catch (RuntimeException e) { LoggerFactory.getLogger(getClass()).warn("No se pudieron caducar interacciones: {}", e.getMessage()); }
    }
}
