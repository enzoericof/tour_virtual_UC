package py.edu.uc.campus_backend.repository;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import py.edu.uc.campus_backend.model.Materia;

public interface MateriaRepository extends JpaRepository<Materia, Long> {

    @EntityGraph(attributePaths = "carreras")
    List<Materia> findAllByOrderByNombreAscIdAsc();

    @EntityGraph(attributePaths = "carreras")
    @Query("select m from Materia m where :carrera member of m.carreras order by m.nombre, m.id")
    List<Materia> findDisponibles(Short carrera);
}
