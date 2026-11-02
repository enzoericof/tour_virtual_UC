package py.edu.uc.campus_backend.dto;

import java.util.List;

public record MateriaResponse(Long id, String nombre, List<Short> carreras) {
}
