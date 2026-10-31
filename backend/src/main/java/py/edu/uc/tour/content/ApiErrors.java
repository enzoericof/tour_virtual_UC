package py.edu.uc.tour.content;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import java.util.Map;
@RestControllerAdvice
public class ApiErrors {
 @ExceptionHandler(MethodArgumentNotValidException.class) public ResponseEntity<?> validation(MethodArgumentNotValidException e){return ResponseEntity.badRequest().body(Map.of("message","Revisá los campos obligatorios y sus límites de longitud."));}
 @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<?> status(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"No se pudo realizar la operación.":e.getReason()));}
 @ExceptionHandler(BadCredentialsException.class) public ResponseEntity<?> credentials(){return ResponseEntity.status(401).body(Map.of("message","Correo o contraseña incorrectos."));}
 @ExceptionHandler(DataIntegrityViolationException.class) public ResponseEntity<?> duplicate(){return ResponseEntity.status(409).body(Map.of("message","Ese registro ya existe o está relacionado con otros datos."));}
}
