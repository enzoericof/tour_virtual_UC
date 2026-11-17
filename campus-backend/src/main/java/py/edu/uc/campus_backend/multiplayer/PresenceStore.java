package py.edu.uc.campus_backend.multiplayer;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/** Comparte los visitantes entre todas las instancias conectadas a PostgreSQL. */
@Repository
public class PresenceStore {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public PresenceStore(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Transactional
    public boolean save(String id, long userId, String sessionId, PresenceSocket.Player player) {
        var key = UUID.fromString(id);
        var pose = json.writeValueAsString(player);
        if (jdbc.update("UPDATE campus_presence SET pose = ?::jsonb, updated_at = clock_timestamp() WHERE id = ?",
                pose, key) == 1) return true;

        // Serializa la asignación de plazas entre todas las instancias del servidor.
        jdbc.execute("SELECT pg_advisory_xact_lock(73190410)");
        cleanExpired();
        return jdbc.update("""
            INSERT INTO campus_presence(id, user_id, session_id, pose, slot)
            SELECT ?, ?, s.session_id, ?::jsonb, free.slot FROM spring_session s
            CROSS JOIN (
                SELECT n AS slot FROM generate_series(1, 10) n
                WHERE NOT EXISTS (SELECT 1 FROM campus_presence p WHERE p.slot = n)
                ORDER BY n LIMIT 1
            ) free
            WHERE s.session_id = ? AND s.expiry_time > ?
            """, key, userId, pose, sessionId, System.currentTimeMillis()) == 1;
    }

    public List<PresenceSocket.Player> players() {
        return jdbc.query("""
            SELECT p.pose, u.skin FROM campus_presence p
            JOIN usuarios u ON u.id = p.user_id
            JOIN spring_session s ON s.session_id = p.session_id
            WHERE p.updated_at > clock_timestamp() - interval '20 seconds'
              AND s.expiry_time > ? AND u.activo = true
            """, (row, index) -> {
                var p = json.readValue(row.getString("pose"), PresenceSocket.Player.class);
                return new PresenceSocket.Player(p.id(), p.name(), row.getString("skin"),
                    p.x(), p.y(), p.z(), p.yaw(), p.walking());
            }, System.currentTimeMillis());
    }

    public void remove(String id) {
        jdbc.update("DELETE FROM campus_presence WHERE id = ?", UUID.fromString(id));
    }

    public void cleanExpired() {
        jdbc.update("DELETE FROM campus_presence WHERE updated_at < clock_timestamp() - interval '20 seconds'");
    }
}
