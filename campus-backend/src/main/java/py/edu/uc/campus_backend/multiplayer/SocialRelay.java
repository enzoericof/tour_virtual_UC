package py.edu.uc.campus_backend.multiplayer;

import jakarta.annotation.PreDestroy;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.function.BooleanSupplier;
import javax.sql.DataSource;
import org.postgresql.PGConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** NOTIFY comunica instancias sin guardar mensajes recientes en tablas. */
@Component
public class SocialRelay {
    final String node = UUID.randomUUID().toString();
    private final DataSource source;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private Connection connection;
    private BiConsumer<JsonNode,Boolean> receiver = (event,local) -> {};
    private BooleanSupplier needed = () -> false;
    public SocialRelay(DataSource source, JdbcTemplate jdbc, ObjectMapper json) {
        this.source = source; this.jdbc = jdbc; this.json = json;
    }
    public void listen(BiConsumer<JsonNode,Boolean> receiver,BooleanSupplier needed) { this.receiver = receiver; this.needed=needed; }
    public void send(Map<String, Object> event) {
        String payload = json.writeValueAsString(Map.of("node", node, "event", event));
        jdbc.queryForObject("SELECT pg_notify('campus_social', ?)", String.class, payload);
        receiver.accept(json.valueToTree(event),true);
    }
    @Scheduled(fixedDelay = 250, scheduler = "socialRelayScheduler")
    public void poll() {
        if(!needed.getAsBoolean()){if(connection!=null)close();return;}
        try {
            if (connection == null || connection.isClosed()) {
                connection = source.getConnection();
                try (var statement = connection.createStatement()) { statement.execute("LISTEN campus_social"); }
                send(Map.of("type", "chat.seed-request", "node", node));
            }
            var notifications = connection.unwrap(PGConnection.class).getNotifications();
            if (notifications == null) return;
            for (var notification : notifications) {
                var envelope = json.readTree(notification.getParameter());
                if (!node.equals(envelope.path("node").asText())) receiver.accept(envelope.path("event"),false);
            }
        } catch (SQLException | RuntimeException e) {
            LoggerFactory.getLogger(getClass()).warn("No se pudo sincronizar el chat; se reintentará: {}", e.getMessage());
            close();
        }
    }
    @PreDestroy
    public void close() {
        if (connection != null) {
            try (var statement=connection.createStatement()) { statement.execute("UNLISTEN campus_social"); }
            catch(SQLException ignored) {}
            try { connection.close(); } catch (SQLException ignored) {}
        }
        connection = null;
    }
}
