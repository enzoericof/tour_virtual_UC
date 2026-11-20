package py.edu.uc.campus_backend.multiplayer;

import java.util.List;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/** Comparte los visitantes entre todas las instancias conectadas a PostgreSQL. */
@Repository
public class PresenceStore {
    public record Update(String id, PresenceSocket.Player pose) {}
    public record Exchange(List<PresenceSocket.Player> players, Set<String> sessions) {}
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public PresenceStore(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Transactional
    public boolean enter(String id, long userId, String sessionId, PresenceSocket.Player player) {
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

    public Exchange exchange(List<Update> updates, List<String> sessionIds) {
        List<PresenceSocket.Player> players = new ArrayList<>();
        Set<String> sessions = new HashSet<>();
        // Una sola ida a PostgreSQL. RETURNING incluye las posiciones recién escritas,
        // porque las lecturas de una CTE modificadora comparten la instantánea inicial.
        jdbc.query("""
            WITH incoming AS (
                SELECT * FROM jsonb_to_recordset(?::jsonb) AS i(id uuid, pose jsonb)
            ), updated AS (
                UPDATE campus_presence p SET pose = i.pose, updated_at = clock_timestamp()
                FROM incoming i WHERE p.id = i.id
                RETURNING p.*
            ), visible AS (
                SELECT * FROM updated
                UNION ALL
                SELECT p.* FROM campus_presence p WHERE NOT EXISTS (SELECT 1 FROM updated u WHERE u.id = p.id)
            )
            SELECT 'player' AS kind, NULL::text AS session_id, p.pose, u.id AS user_id
            FROM visible p JOIN usuarios u ON u.id = p.user_id
            JOIN spring_session s ON s.session_id = p.session_id
            WHERE p.updated_at > clock_timestamp() - interval '20 seconds'
              AND s.expiry_time > ? AND u.activo = true AND s.principal_name = u.correo
            UNION ALL
            SELECT 'session', s.session_id, NULL::jsonb, NULL::bigint
            FROM spring_session s JOIN usuarios u ON u.correo = s.principal_name
            WHERE s.session_id IN (SELECT jsonb_array_elements_text(?::jsonb))
              AND s.expiry_time > ? AND u.activo = true
            """, row -> {
                if (row.getString("kind").equals("session")) {
                    sessions.add(row.getString("session_id"));
                } else {
                    var p = json.readValue(row.getString("pose"), PresenceSocket.Player.class);
                    players.add(new PresenceSocket.Player(p.id(), p.name(), AvatarColor.forUser(row.getLong("user_id")),
                        p.x(), p.y(), p.z(), p.yaw(), p.walking(), p.at(), p.hidden()));
                }
            }, json.writeValueAsString(updates), System.currentTimeMillis(),
            json.writeValueAsString(sessionIds), System.currentTimeMillis());
        return new Exchange(players, sessions);
    }

    public void remove(String id) {
        jdbc.update("DELETE FROM campus_presence WHERE id = ?", UUID.fromString(id));
    }

    public void cleanExpired() {
        jdbc.update("DELETE FROM campus_presence WHERE updated_at < clock_timestamp() - interval '20 seconds'");
    }
}
