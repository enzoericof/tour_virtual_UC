package py.edu.uc.campus_backend.repository;

import py.edu.uc.campus_backend.model.Trabajo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrabajoRepository extends JpaRepository<Trabajo, Long> {

    List<Trabajo> findByUsuarioId(Long usuarioId);
}