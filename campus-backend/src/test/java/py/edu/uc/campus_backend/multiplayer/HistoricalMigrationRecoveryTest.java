package py.edu.uc.campus_backend.multiplayer;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import static org.junit.jupiter.api.Assertions.*;

class HistoricalMigrationRecoveryTest {
    @Test
    @EnabledIfEnvironmentVariable(named="PRESENCE_TEST_DB",matches="jdbc:postgresql://127\\.0\\.0\\.1:55433/tour_fluidity")
    void recoversMissingMetadataMigrationThenAddsCarsWithoutLosingExistingPoses() {
        String url=System.getenv("PRESENCE_TEST_DB");
        var ds=new DriverManagerDataSource(url,"campus_test","");
        var jdbc=new JdbcTemplate(ds);
        jdbc.execute("DROP SCHEMA IF EXISTS migration_recovery_test CASCADE");
        jdbc.execute("CREATE SCHEMA migration_recovery_test");
        String schema="migration_recovery_test",locations="filesystem:src/main/resources/db/migration";
        Flyway.configure().dataSource(ds).schemas(schema).defaultSchema(schema).locations(locations).target("12").load().migrate();
        ds.setUrl(url+"?currentSchema="+schema);
        // Simula el V13 perdido que ya existía en la base compartida.
        jdbc.execute("ALTER TABLE archivos_trabajo ADD COLUMN tipo_contenido VARCHAR(100), ADD COLUMN tamano_bytes BIGINT, ADD CONSTRAINT chk_archivos_trabajo_tamano_bytes CHECK (tamano_bytes IS NULL OR tamano_bytes > 0), ADD CONSTRAINT chk_archivos_trabajo_tipo_contenido CHECK (tipo_contenido IS NULL OR length(trim(tipo_contenido)) > 0)");
        jdbc.update("INSERT INTO flyway_schema_history(installed_rank,version,description,type,script,checksum,installed_by,execution_time,success) VALUES (13,'13','agregar metadatos archivos trabajo','SQL','V13__agregar_metadatos_archivos_trabajo.sql',1110147372,current_user,0,true)");
        jdbc.update("UPDATE campus_vehicles SET pose=jsonb_set(pose,'{x}','123.45'::jsonb) WHERE id='raptor-0'");
        var flyway=Flyway.configure().dataSource(ds).schemas(schema).defaultSchema(schema).locations(locations).load();
        assertFalse(flyway.validateWithResult().validationSuccessful,"Detecta el checksum histórico distinto");
        assertEquals(1,flyway.repair().migrationsAligned.size(),"Solo realinea la migración recuperada");
        flyway.migrate();flyway.validate();
        assertEquals(16,jdbc.queryForObject("SELECT count(*) FROM campus_vehicles",Integer.class));
        assertEquals(123.45,jdbc.queryForObject("SELECT (pose->>'x')::double precision FROM campus_vehicles WHERE id='raptor-0'",Double.class),.001,"V14 conserva los vehículos existentes");
        assertEquals(100,jdbc.queryForObject("SELECT character_maximum_length FROM information_schema.columns WHERE table_schema=? AND table_name='archivos_trabajo' AND column_name='tipo_contenido'",Integer.class,schema));
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM information_schema.columns WHERE table_schema=? AND table_name='archivos_trabajo' AND column_name IN ('tipo_contenido','tamano_bytes') AND is_nullable='YES' AND column_default IS NULL",Integer.class,schema));
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM pg_constraint WHERE conrelid='archivos_trabajo'::regclass AND conname IN ('chk_archivos_trabajo_tamano_bytes','chk_archivos_trabajo_tipo_contenido')",Integer.class));
    }
}
