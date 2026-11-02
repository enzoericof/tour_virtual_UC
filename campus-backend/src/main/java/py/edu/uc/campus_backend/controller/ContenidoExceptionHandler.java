package py.edu.uc.campus_backend.controller;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

// Se limita a contenido para conservar el contrato de autenticación existente.
@RestControllerAdvice(assignableTypes = {TrabajoController.class, MateriaController.class})
public class ContenidoExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> reglaDeNegocio(ResponseStatusException exception) {
        String mensaje = exception.getReason() == null
            ? "No se pudo completar la operación." : exception.getReason();
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of("mensaje", mensaje));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validacion(MethodArgumentNotValidException exception) {
        var errores = exception.getBindingResult().getFieldErrors().stream()
            .map(error -> Map.of("campo", error.getField(), "mensaje",
                error.getDefaultMessage() == null ? "Valor inválido." : error.getDefaultMessage()))
            .toList();
        return ResponseEntity.badRequest().body(Map.of(
            "mensaje", "Revisá los datos del trabajo.", "errores", errores));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<?> formatoInvalido(Exception exception) {
        return ResponseEntity.badRequest().body(Map.of("mensaje",
            "El cuerpo debe ser JSON válido y los identificadores y la paginación deben ser números enteros."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> integridad(DataIntegrityViolationException exception) {
        return ResponseEntity.status(409).body(Map.of("mensaje",
            "No se pudo guardar el cambio porque los datos relacionados ya no están disponibles o son incompatibles."));
    }
}
