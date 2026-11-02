package py.edu.uc.campus_backend.service;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import py.edu.uc.campus_backend.dto.MateriaResponse;
import py.edu.uc.campus_backend.model.Materia;
import py.edu.uc.campus_backend.model.Usuario;
import py.edu.uc.campus_backend.repository.MateriaRepository;

@Service
public class MateriaService {

    private final MateriaRepository materiaRepository;
    private final UsuarioService usuarioService;

    public MateriaService(MateriaRepository materiaRepository, UsuarioService usuarioService) {
        this.materiaRepository = materiaRepository;
        this.usuarioService = usuarioService;
    }

    @Transactional(readOnly = true)
    public List<MateriaResponse> listarDisponibles(String correo) {
        Usuario usuario = usuarioService.obtenerActivo(correo);
        List<Materia> materias;
        if (usuario.esAdministrador()) {
            materias = materiaRepository.findAllByOrderByNombreAscIdAsc();
        } else {
            if (usuario.getCarrera() == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "La cuenta de estudiante no tiene una carrera asignada.");
            }
            materias = materiaRepository.findDisponibles(usuario.getCarrera());
        }
        return materias.stream().map(materia -> new MateriaResponse(
            materia.getId(), materia.getNombre(), materia.getCarreras().stream().sorted().toList()
        )).toList();
    }
}
