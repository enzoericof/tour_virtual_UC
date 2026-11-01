package py.edu.uc.campus_backend.repository;

import py.edu.uc.campus_backend.model.ArchivoTrabajo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ArchivoTrabajoRepository extends JpaRepository<ArchivoTrabajo, Long> {

    List<ArchivoTrabajo> findByTrabajoIdOrderByOrdenAsc(Long trabajoId);
}