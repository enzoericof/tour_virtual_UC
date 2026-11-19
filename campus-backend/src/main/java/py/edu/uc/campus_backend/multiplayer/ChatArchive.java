package py.edu.uc.campus_backend.multiplayer;

import py.edu.uc.campus_backend.dto.ChatMessage;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ChatArchive {
    private final JdbcTemplate jdbc;
    public ChatArchive(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void save(ChatMessage m) {
        jdbc.update("INSERT INTO campus_chat_archive VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
            UUID.fromString(m.id()), m.userId(), m.name(), m.text(), m.sentAt());
    }
    public List<ChatMessage> history(long cutoff, long before, String beforeId) {
        return jdbc.query("""
            SELECT * FROM campus_chat_archive WHERE sent_at <= ? AND (sent_at, id) < (?, ?::uuid)
            ORDER BY sent_at DESC, id DESC LIMIT 51
            """, (r, n) -> new ChatMessage(r.getString("id"), r.getLong("user_id"), r.getString("name"),
                r.getString("text"), r.getLong("sent_at")), cutoff, before, beforeId);
    }
}
