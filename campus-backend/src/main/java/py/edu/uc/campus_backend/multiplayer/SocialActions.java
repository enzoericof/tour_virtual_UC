package py.edu.uc.campus_backend.multiplayer;

import py.edu.uc.campus_backend.dto.SocialAction;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Repository
public class SocialActions {
    public static final Set<String> PAIRED = Set.of("high-five", "hold-hands");
    public static final Map<String, Long> DURATIONS = Map.of("high-five", 3200L, "hold-hands", 5600L,
        "ok", 3000L, "peace", 3000L, "ragdoll", 6500L);
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public SocialActions(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }
    private void lock() { jdbc.execute("SELECT pg_advisory_xact_lock(73190411)"); }
    private PresenceSocket.Player player(String id) {
        var list = jdbc.query("""
            SELECT p.pose FROM campus_presence p JOIN spring_session s ON s.session_id = p.session_id
            JOIN usuarios u ON u.id = p.user_id
            WHERE p.id = ? AND p.updated_at > clock_timestamp() - interval '3 seconds'
              AND s.expiry_time > ? AND u.activo = true AND s.principal_name = u.correo
            """, (r, n) -> json.readValue(r.getString("pose"), PresenceSocket.Player.class),
            UUID.fromString(id), System.currentTimeMillis());
        if (list.isEmpty() || list.getFirst().hidden()) throw new IllegalArgumentException("Volvé al recorrido para interactuar.");
        return list.getFirst();
    }
    public static boolean close(PresenceSocket.Player a, PresenceSocket.Player b, boolean facing) {
        double dx = b.x() - a.x(), dz = b.z() - a.z(), distance = Math.hypot(dx, dz);
        return !a.id().equals(b.id()) && distance >= 0.3 && distance <= 1.9 && Math.abs(a.y() - b.y()) < 0.65
            && (!facing || (-Math.sin(a.yaw()) * dx - Math.cos(a.yaw()) * dz) / distance > 0.82);
    }
    private void available(String id, long now) {
        var count = jdbc.queryForObject("""
            SELECT count(*) FROM campus_social_actions WHERE status IN ('pending', 'active')
              AND expires_at > ? AND (sender = ?::uuid OR recipient = ?::uuid)
            """, Integer.class, now, id, id);
        if (count != null && count > 0) throw new IllegalArgumentException("Ya hay una interacción en curso. Esperá a que termine.");
    }
    @Transactional
    public SocialAction request(String from, String to, String kind, long now) {
        if (!DURATIONS.containsKey(kind)) throw new IllegalArgumentException("Ese gesto no está disponible.");
        boolean pair = PAIRED.contains(kind);
        if (pair && (to == null || to.equals(from))) throw new IllegalArgumentException("Mirá a otro visitante cercano.");
        lock(); available(from, now);
        var a = player(from);
        var b = pair ? player(to) : null;
        if (pair) {
            available(to, now);
            var sameUser=jdbc.queryForObject("SELECT count(*) FROM campus_presence a JOIN campus_presence b ON a.user_id=b.user_id WHERE a.id=?::uuid AND b.id=?::uuid",
                Integer.class,from,to);
            if(sameUser!=null&&sameUser>0)throw new IllegalArgumentException("Elegí a una persona con otra cuenta.");
            if (!close(a, b, true)) throw new IllegalArgumentException("Acercate y mirá al otro visitante.");
        }
        var action = new SocialAction(UUID.randomUUID().toString(), kind, from, pair ? to : null,
            a.name(), b == null ? null : b.name(), a, b, pair ? "pending" : "active", now,
            now + (pair ? 12000 : DURATIONS.get(kind)));
        jdbc.update("""
            INSERT INTO campus_social_actions VALUES (?::uuid, ?, ?::uuid, ?::uuid, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?)
            """, action.id(), kind, from, action.to(), action.fromName(), action.toName(),
            json.writeValueAsString(a), b == null ? null : json.writeValueAsString(b), action.status(), now, action.expiresAt());
        return action;
    }
    @Transactional
    public SocialAction respond(String actor, String id, boolean accept, boolean cancel, long now) {
        lock();
        var list = jdbc.query("SELECT * FROM campus_social_actions WHERE id = ?::uuid FOR UPDATE", this::read, id);
        if (list.isEmpty()) throw new IllegalArgumentException("La solicitud ya no está disponible.");
        var a = list.getFirst();
        if (!(actor.equals(a.to()) || (cancel && actor.equals(a.from()))))
            throw new IllegalArgumentException("Esta solicitud corresponde a otro visitante.");
        if ((!cancel && !a.status().equals("pending")) || a.expiresAt() <= now
            || (!a.status().equals("pending") && !a.status().equals("active")))
            throw new IllegalArgumentException("La solicitud ya terminó.");
        var fromPose = a.fromPose(); var toPose = a.toPose();
        if (accept && !cancel) {
            fromPose = player(a.from()); toPose = player(a.to());
            if (!close(fromPose, toPose, false)) throw new IllegalArgumentException("Se alejaron demasiado. Volvé a enviar la solicitud.");
        }
        String status = cancel ? "cancelled" : accept ? "active" : "declined";
        long expires = status.equals("active") ? now + DURATIONS.get(a.kind()) : now;
        jdbc.update("""
            UPDATE campus_social_actions SET status = ?, started_at = ?, expires_at = ?, sender_pose = ?::jsonb,
              recipient_pose = ?::jsonb WHERE id = ?::uuid
            """, status, now, expires, json.writeValueAsString(fromPose), json.writeValueAsString(toPose), id);
        return new SocialAction(id, a.kind(), a.from(), a.to(), a.fromName(), a.toName(), fromPose, toPose, status, now, expires);
    }
    private SocialAction read(java.sql.ResultSet r, int n) throws java.sql.SQLException {
        return new SocialAction(r.getString("id"), r.getString("kind"), r.getString("sender"), r.getString("recipient"),
            r.getString("sender_name"), r.getString("recipient_name"),
            json.readValue(r.getString("sender_pose"), PresenceSocket.Player.class),
            r.getString("recipient_pose") == null ? null : json.readValue(r.getString("recipient_pose"), PresenceSocket.Player.class),
            r.getString("status"), r.getLong("started_at"), r.getLong("expires_at"));
    }
    public List<SocialAction> current(long now) {
        return jdbc.query("SELECT * FROM campus_social_actions WHERE status IN ('pending', 'active') AND expires_at > ?", this::read, now);
    }
    public List<SocialAction> expire(long now) {
        return jdbc.query("""
            UPDATE campus_social_actions a SET status = 'expired', expires_at = ?
            WHERE status IN ('pending', 'active') AND (expires_at <= ?
              OR NOT EXISTS (SELECT 1 FROM campus_presence p WHERE p.id = a.sender
                  AND p.updated_at > clock_timestamp() - interval '20 seconds' AND p.pose->>'hidden' = 'false')
              OR (recipient IS NOT NULL AND NOT EXISTS (SELECT 1 FROM campus_presence p WHERE p.id = a.recipient
                  AND p.updated_at > clock_timestamp() - interval '20 seconds' AND p.pose->>'hidden' = 'false')))
            RETURNING a.*
            """, this::read, now, now);
    }
    public void clean(long now) { jdbc.update("DELETE FROM campus_social_actions WHERE expires_at < ?", now - 60000); }
    public void requireRagdoll(String actor,String id,long now) {
        var count=jdbc.queryForObject("""
            SELECT count(*) FROM campus_social_actions WHERE id=?::uuid AND sender=?::uuid
            AND kind='ragdoll' AND status='active' AND expires_at>?
            """,Integer.class,id,actor,now);
        if(count==null||count!=1)throw new IllegalArgumentException("Ese cuerpo ya no está en caída.");
    }
}
