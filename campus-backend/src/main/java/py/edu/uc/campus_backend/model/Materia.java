package py.edu.uc.campus_backend.model;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "materias")
public class Materia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "materias_carreras", joinColumns = @JoinColumn(name = "materia_id"))
    @Column(name = "carrera", nullable = false)
    private Set<Short> carreras = new HashSet<>();

    public Materia() {
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public Set<Short> getCarreras() {
        return carreras;
    }
}
