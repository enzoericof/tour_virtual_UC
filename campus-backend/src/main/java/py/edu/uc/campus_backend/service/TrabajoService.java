package py.edu.uc.campus_backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import py.edu.uc.campus_backend.dto.PaginaTrabajosResponse;
import py.edu.uc.campus_backend.dto.TrabajoRequest;
import py.edu.uc.campus_backend.dto.TrabajoResponse;
import py.edu.uc.campus_backend.model.Materia;
import py.edu.uc.campus_backend.model.Trabajo;
import py.edu.uc.campus_backend.model.Usuario;
import py.edu.uc.campus_backend.repository.MateriaRepository;
import py.edu.uc.campus_backend.repository.TrabajoRepository;

@Service
public class TrabajoService {

    private final TrabajoRepository trabajoRepository;
    private final MateriaRepository materiaRepository;
    private final UsuarioService usuarioService;

    public TrabajoService(TrabajoRepository trabajoRepository,
            MateriaRepository materiaRepository, UsuarioService usuarioService) {
        this.trabajoRepository = trabajoRepository;
        this.materiaRepository = materiaRepository;
        this.usuarioService = usuarioService;
    }

    @Transactional
    public TrabajoResponse crear(TrabajoRequest request, String correo) {
        Usuario usuario = usuarioService.obtenerActivo(correo);
        Materia materia = buscarMateria(request.materiaId());
        validarMateriaDelAutor(materia, usuario);

        Trabajo trabajo = new Trabajo();
        trabajo.setUsuario(usuario);
        completar(trabajo, request, materia);
        return respuesta(trabajoRepository.saveAndFlush(trabajo));
    }

    @Transactional(readOnly = true)
    public PaginaTrabajosResponse listar(Long materiaId, int pagina, int tamano, String correo) {
        usuarioService.obtenerActivo(correo);
        if (pagina < 0 || tamano < 1 || tamano > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "La página debe ser mayor o igual a 0 y el tamaño debe estar entre 1 y 100.");
        }
        PageRequest consulta = PageRequest.of(pagina, tamano,
            Sort.by(Sort.Direction.DESC, "fechaPublicacion", "id"));
        Page<Trabajo> trabajos;
        if (materiaId == null) {
            trabajos = trabajoRepository.findAll(consulta);
        } else {
            buscarMateria(materiaId);
            trabajos = trabajoRepository.findByMateriaId(materiaId, consulta);
        }
        return new PaginaTrabajosResponse(
            trabajos.getContent().stream().map(this::respuesta).toList(),
            pagina, tamano, trabajos.getTotalElements(), trabajos.getTotalPages());
    }

    @Transactional(readOnly = true)
    public TrabajoResponse obtener(Long id, String correo) {
        usuarioService.obtenerActivo(correo);
        return respuesta(buscarTrabajo(id));
    }

    @Transactional
    public TrabajoResponse actualizar(Long id, TrabajoRequest request, String correo) {
        Usuario actor = usuarioService.obtenerActivo(correo);
        Trabajo trabajo = buscarTrabajo(id);
        validarPermiso(trabajo, actor);
        Materia materia = buscarMateria(request.materiaId());
        // La clasificación corresponde al autor original, incluso si edita un administrador.
        validarMateriaDelAutor(materia, trabajo.getUsuario());
        completar(trabajo, request, materia);
        // Ejecutar @PreUpdate antes de devolver la fecha actualizada.
        return respuesta(trabajoRepository.saveAndFlush(trabajo));
    }

    @Transactional
    public void eliminar(Long id, String correo) {
        Usuario actor = usuarioService.obtenerActivo(correo);
        Trabajo trabajo = buscarTrabajo(id);
        validarPermiso(trabajo, actor);
        // V3 elimina los metadatos por FK; todavía no hay almacenamiento físico.
        trabajoRepository.delete(trabajo);
    }

    private Trabajo buscarTrabajo(Long id) {
        validarId(id);
        return trabajoRepository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "El trabajo no existe."));
    }

    private Materia buscarMateria(Long id) {
        validarId(id);
        return materiaRepository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "La materia no existe."));
    }

    private void validarId(Long id) {
        if (id == null || id <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "El identificador debe ser positivo.");
        }
    }

    private void validarMateriaDelAutor(Materia materia, Usuario autor) {
        if (!autor.esAdministrador() && (autor.getCarrera() == null
                || !materia.getCarreras().contains(autor.getCarrera()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "La materia no pertenece a la carrera del autor del trabajo.");
        }
    }

    private void validarPermiso(Trabajo trabajo, Usuario actor) {
        if (!actor.esAdministrador() && !trabajo.getUsuario().getId().equals(actor.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Solo el propietario o un administrador puede modificar o eliminar el trabajo.");
        }
    }

    private void completar(Trabajo trabajo, TrabajoRequest request, Materia materia) {
        trabajo.setTitulo(request.titulo().trim());
        trabajo.setDescripcion(request.descripcion().trim());
        trabajo.setMateria(materia);
    }

    private TrabajoResponse respuesta(Trabajo trabajo) {
        return new TrabajoResponse(trabajo.getId(), trabajo.getTitulo(), trabajo.getDescripcion(),
            trabajo.getUsuario().getId(), trabajo.getMateria().getId(), trabajo.getMateria().getNombre(),
            trabajo.getFechaPublicacion(), trabajo.getFechaActualizacion());
    }
}
