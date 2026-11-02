package py.edu.uc.campus_backend.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import py.edu.uc.campus_backend.dto.PaginaTrabajosResponse;

import py.edu.uc.campus_backend.dto.TrabajoRequest;
import py.edu.uc.campus_backend.dto.TrabajoResponse;
import py.edu.uc.campus_backend.service.TrabajoService;

@RestController
@RequestMapping("/api/trabajos")
public class TrabajoController {

    private final TrabajoService trabajoService;

    public TrabajoController(TrabajoService trabajoService) {
        this.trabajoService = trabajoService;
    }

    @GetMapping
    public PaginaTrabajosResponse listar(
            @RequestParam(required = false) Long materiaId,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamano,
            Authentication authentication) {
        return trabajoService.listar(materiaId, pagina, tamano, authentication.getName());
    }

    @GetMapping("/{id}")
    public TrabajoResponse obtener(@PathVariable Long id, Authentication authentication) {
        return trabajoService.obtener(id, authentication.getName());
    }

    @PutMapping("/{id}")
    public TrabajoResponse actualizar(@PathVariable Long id,
            @Valid @RequestBody TrabajoRequest request, Authentication authentication) {
        return trabajoService.actualizar(id, request, authentication.getName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id, Authentication authentication) {
        trabajoService.eliminar(id, authentication.getName());
    }

    @PostMapping
    public ResponseEntity<TrabajoResponse> crear(
            @Valid @RequestBody TrabajoRequest request,
            Authentication authentication) {

        TrabajoResponse respuesta = trabajoService.crear(
            request,
            authentication.getName()
        );

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(respuesta);
    }
}
