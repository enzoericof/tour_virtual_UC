package py.edu.uc.campus_backend.multiplayer;

import py.edu.uc.campus_backend.dto.ChatMessage;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.stereotype.Component;

/** Ventana de cinco minutos. Nunca elimina un mensaje vencido si falla su archivo. */
@Component
public class RecentChat {
    public static final long WINDOW = 300_000;
    private final LinkedHashMap<String, ChatMessage> messages = new LinkedHashMap<>();
    public synchronized boolean hasPending() { return !messages.isEmpty(); }
    public synchronized boolean add(ChatMessage message, long now) {
        if (message.sentAt() <= now - WINDOW || messages.containsKey(message.id())) return false;
        if (messages.size() >= 10000) throw new IllegalArgumentException("El chat está ocupado. Reintentá en unos segundos.");
        messages.put(message.id(), message); return true;
    }
    public synchronized List<ChatMessage> recent(long now) {
        return messages.values().stream().filter(m -> m.sentAt() > now - WINDOW)
            .sorted(Comparator.comparingLong(ChatMessage::sentAt).thenComparing(ChatMessage::id)).toList();
    }
    public void archive(ChatArchive archive, long now) {
        List<ChatMessage> expired;
        synchronized (this) { expired = new ArrayList<>(messages.values().stream().filter(m -> m.sentAt() <= now - WINDOW).toList()); }
        for (var m : expired) {
            archive.save(m);
            synchronized (this) { messages.remove(m.id(), m); }
        }
    }
}
