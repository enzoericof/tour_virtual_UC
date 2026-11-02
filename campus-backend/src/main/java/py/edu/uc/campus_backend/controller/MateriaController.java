package py.edu.uc.campus_backend.controller;

import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import py.edu.uc.campus_backend.dto.MateriaResponse;
import py.edu.uc.campus_backend.service.MateriaService;

@RestController
@RequestMapping("/api/materias")
public class MateriaController {

    private final MateriaService materiaService;

    public MateriaController(MateriaService materiaService) {
        this.materiaService = materiaService;
    }

    @GetMapping
    public List<MateriaResponse> listar(Authentication authentication) {
        return materiaService.listarDisponibles(authentication.getName());
    }
}
