package py.edu.uc.campus_backend.dto;

import java.util.List;

public record PaginaTrabajosResponse(
        List<TrabajoResponse> contenido,
        int pagina,
        int tamano,
        long totalElementos,
        int totalPaginas) {
}
