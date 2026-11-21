package py.edu.uc.campus_backend.multiplayer;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import py.edu.uc.campus_backend.dto.VehicleState;
import tools.jackson.databind.ObjectMapper;

/** Ocho filas durables y reservas atómicas compartidas entre instancias. */
@Repository
public class VehicleStore {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public VehicleStore(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    public boolean claim(String id,String driver) {
        return jdbc.update("""
            UPDATE campus_vehicles v SET driver=?, updated_at=clock_timestamp()
            FROM campus_presence p WHERE v.id=? AND p.id=? AND NOT (p.pose->>'hidden')::boolean
            AND p.updated_at > clock_timestamp()-interval '3 seconds'
            AND (v.driver IS NULL OR v.driver=? OR v.updated_at<clock_timestamp()-interval '6 seconds')
            AND NOT EXISTS(SELECT 1 FROM campus_vehicles other WHERE other.driver=p.id AND other.id<>v.id)
            AND power((p.pose->>'x')::double precision-(v.pose->>'x')::double precision,2)
              +power((p.pose->>'z')::double precision-(v.pose->>'z')::double precision,2)<20.25
            AND abs((p.pose->>'y')::double precision-(v.pose->>'y')::double precision)<2.5
            """,UUID.fromString(driver),id,UUID.fromString(driver),UUID.fromString(driver))==1;
    }
    public boolean move(String id,String driver,VehicleState state) {
        return jdbc.update("""
            UPDATE campus_vehicles SET pose=?::jsonb,updated_at=clock_timestamp()
            WHERE id=? AND driver=? AND updated_at>clock_timestamp()-interval '6 seconds'
            AND power((pose->>'x')::double precision-?,2)+power((pose->>'z')::double precision-?,2)
              <=power(36*(least(1,extract(epoch FROM clock_timestamp()-updated_at))+.35)+.5,2)
            AND abs((pose->>'y')::double precision-?)<1.2
            """,json.writeValueAsString(state),id,UUID.fromString(driver),state.x(),state.z(),state.y())==1;
    }
    public void release(String driver,String id) {
        jdbc.update("UPDATE campus_vehicles SET driver=NULL, pose=jsonb_set(pose,'{speed}','0'::jsonb), updated_at=clock_timestamp() WHERE driver=? AND (? IS NULL OR id=?)",
            UUID.fromString(driver),id,id);
    }
    public List<VehicleState> snapshot() {
        jdbc.update("""
            UPDATE campus_vehicles v SET driver=NULL,pose=jsonb_set(pose,'{speed}','0'::jsonb)
            WHERE driver IS NOT NULL AND (updated_at<clock_timestamp()-interval '6 seconds'
              OR NOT EXISTS(SELECT 1 FROM campus_presence p JOIN spring_session s ON s.session_id=p.session_id
                WHERE p.id=v.driver AND p.updated_at>clock_timestamp()-interval '20 seconds'
                AND s.expiry_time>extract(epoch FROM clock_timestamp())*1000 AND NOT (p.pose->>'hidden')::boolean))
            """);
        return jdbc.query("SELECT id,pose,driver,extract(epoch FROM updated_at)*1000 AS at FROM campus_vehicles ORDER BY id",(row,n)->{
            var p=json.readValue(row.getString("pose"),VehicleState.class);
            return new VehicleState(row.getString("id"),p.x(),p.y(),p.z(),p.yaw(),p.speed(),p.steer(),row.getString("driver"),row.getLong("at"));
        });
    }
}
