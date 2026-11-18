package py.edu.uc.campus_backend.multiplayer;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class PresenceStoreTest {
    @Test
    @EnabledIfEnvironmentVariable(named = "PRESENCE_TEST_DB", matches = "jdbc:postgresql://127\\.0\\.0\\.1:55433/tour_fluidity")
    void sharesTimestampedMovementAndPreservesCapacityAndSessionRevocation() {
        var ds = new DriverManagerDataSource(System.getenv("PRESENCE_TEST_DB"), "campus_test", "");
        var jdbc = new JdbcTemplate(ds);
        // Exclusivamente la base desechable nombrada en la condición; no usa las credenciales del proyecto.
        jdbc.execute("DROP SCHEMA IF EXISTS presence_test CASCADE");
        jdbc.execute("CREATE SCHEMA presence_test");
        ds.setUrl(System.getenv("PRESENCE_TEST_DB") + "?currentSchema=presence_test");
        jdbc.execute("CREATE TABLE usuarios(id bigint PRIMARY KEY, correo text, skin text, activo boolean)");
        jdbc.execute("CREATE TABLE spring_session(session_id text PRIMARY KEY, principal_name text, expiry_time bigint)");
        jdbc.execute("CREATE TABLE campus_presence(id uuid PRIMARY KEY, user_id bigint, session_id text, pose jsonb, updated_at timestamptz DEFAULT clock_timestamp(), slot int UNIQUE)");
        jdbc.update("INSERT INTO usuarios VALUES (1, 'test@example.invalid', 'azul', true)");
        jdbc.update("INSERT INTO spring_session VALUES ('session', 'test@example.invalid', ?)", System.currentTimeMillis() + 60000);
        var store = new PresenceStore(jdbc, new ObjectMapper());
        var tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
        var updates = new ArrayList<PresenceStore.Update>();
        for (int i = 0; i < 10; i++) {
            var p = new PresenceSocket.Player(UUID.randomUUID().toString(), "Prueba", "azul", i, 0, 0, 0, true, 1000 + i);
            assertEquals(true, tx.execute(status -> store.enter(p.id(), 1, "session", p)));
            updates.add(new PresenceStore.Update(p.id(), p));
        }
        var extra = new PresenceSocket.Player(UUID.randomUUID().toString(), "Extra", "azul", 0, 0, 0, 0, false);
        assertEquals(false, tx.execute(status -> store.enter(extra.id(), 1, "session", extra)));
        var shared = store.exchange(updates, List.of("session"));
        assertEquals(10, shared.players().size());
        assertTrue(shared.sessions().contains("session"));
        assertTrue(shared.players().stream().allMatch(p -> p.at() >= 1000 && p.at() < 1010));
        store.remove(updates.get(0).id());
        assertEquals(true, tx.execute(status -> store.enter(extra.id(), 1, "session", extra)));
        jdbc.update("UPDATE spring_session SET expiry_time = 0");
        var revoked = store.exchange(List.of(), List.of("session"));
        assertTrue(revoked.players().isEmpty());
        assertTrue(revoked.sessions().isEmpty());
    }
}
