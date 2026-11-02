package py.edu.uc.campus_backend.repository;

import py.edu.uc.campus_backend.model.Trabajo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface TrabajoRepository extends JpaRepository<Trabajo, Long> {

    List<Trabajo> findByUsuarioId(Long usuarioId);

    @Override
    @EntityGraph(attributePaths = {"materia", "usuario"})
    Page<Trabajo> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"materia", "usuario"})
    Page<Trabajo> findByMateriaId(Long materiaId, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"materia", "usuario"})
    Optional<Trabajo> findById(Long id);
}
