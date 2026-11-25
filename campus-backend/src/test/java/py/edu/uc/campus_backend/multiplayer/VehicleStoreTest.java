package py.edu.uc.campus_backend.multiplayer;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import tools.jackson.databind.ObjectMapper;
import py.edu.uc.campus_backend.dto.VehicleState;
import static org.junit.jupiter.api.Assertions.*;

class VehicleStoreTest {
    @Test
    @EnabledIfEnvironmentVariable(named="PRESENCE_TEST_DB",matches="jdbc:postgresql://127\\.0\\.0\\.1:55433/tour_fluidity")
    void atomicReservationOwnershipDurableParkingLateJoinAndExpiredDriver() throws Exception {
        var ds=new DriverManagerDataSource(System.getenv("PRESENCE_TEST_DB"),"campus_test","");
        var jdbc=new JdbcTemplate(ds);
        jdbc.execute("DROP SCHEMA IF EXISTS vehicle_test CASCADE");jdbc.execute("CREATE SCHEMA vehicle_test");
        ds.setUrl(System.getenv("PRESENCE_TEST_DB")+"?currentSchema=vehicle_test");
        jdbc.execute("CREATE TABLE campus_presence(id uuid PRIMARY KEY,pose jsonb,updated_at timestamptz DEFAULT clock_timestamp(),session_id text)");
        jdbc.execute("CREATE TABLE spring_session(session_id text PRIMARY KEY,expiry_time bigint)");
        jdbc.update("INSERT INTO spring_session VALUES ('test',?)",System.currentTimeMillis()+60000);
        jdbc.execute(Files.readString(Path.of("src/main/resources/db/migration/V12__camionetas_compartidas.sql")));
        jdbc.execute(Files.readString(Path.of("src/main/resources/db/migration/V14__plazas_adicionales_led.sql")));
        var one=new VehicleStore(jdbc,new ObjectMapper());var two=new VehicleStore(jdbc,new ObjectMapper());
        var initial=one.snapshot().getFirst();assertEquals(16,one.snapshot().size());
        assertTrue(one.snapshot().stream().anyMatch(v->v.id().equals("raptor-15")));
        String a=UUID.randomUUID().toString(),b=UUID.randomUUID().toString();
        for(String id:new String[]{a,b})jdbc.update("INSERT INTO campus_presence(id,pose,session_id) VALUES (?,?::jsonb,'test')",UUID.fromString(id),"{\"x\":"+initial.x()+",\"y\":0,\"z\":"+initial.z()+",\"hidden\":false}");
        var start=new CountDownLatch(1);boolean first;
        try(var pool=Executors.newFixedThreadPool(2)) {
            var f=pool.submit(()->{start.await();return one.claim(initial.id(),a);});
            var g=pool.submit(()->{start.await();return two.claim(initial.id(),b);});start.countDown();
            first=f.get(5,TimeUnit.SECONDS);assertNotEquals(first,g.get(5,TimeUnit.SECONDS));
        }
        String owner=first?a:b,other=first?b:a;
        var moved=new VehicleState(initial.id(),initial.x()+1,0,initial.z(),initial.yaw(),2,0,owner,0);
        assertFalse(two.move(initial.id(),other,moved));assertTrue(one.move(initial.id(),owner,moved));
        assertFalse(two.claim("raptor-1",owner),"Una persona no posee dos camionetas");
        var teleported=new VehicleState(initial.id(),500,0,500,0,0,0,owner,0);assertFalse(one.move(initial.id(),owner,teleported));
        two.release(other,initial.id());assertEquals(owner,one.snapshot().getFirst().driver());
        one.release(owner,null);
        var late=new VehicleStore(jdbc,new ObjectMapper()).snapshot().getFirst();assertEquals(moved.x(),late.x());assertEquals(0,late.speed());assertNull(late.driver());
        assertTrue(two.claim(initial.id(),other));jdbc.update("UPDATE campus_vehicles SET updated_at=clock_timestamp()-interval '7 seconds' WHERE id=?",initial.id());
        assertNull(one.snapshot().getFirst().driver());assertEquals(moved.x(),one.snapshot().getFirst().x());
        jdbc.update("UPDATE campus_presence SET pose=jsonb_set(pose,'{x}','700'::jsonb)");assertFalse(one.claim(initial.id(),owner),"No se monta a distancia");
    }
}
