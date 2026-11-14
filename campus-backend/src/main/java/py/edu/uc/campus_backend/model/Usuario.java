package py.edu.uc.campus_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios")
public class Usuario {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, length = 100)
    private String apellido;

    @Column(nullable = false, unique = true, length = 150)
    private String correo;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false)
    private Short rol;

    private Short carrera;

    @Column(nullable = false, length = 16)
    private String skin = "azul";

    public String getSkin() { return skin; }

    public void setSkin(String skin) { this.skin = skin; }

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro;

    @Column(nullable = false)
    private Boolean activo;

    public Usuario() {
    }

    @PrePersist
    protected void prePersist() {
        if (fechaRegistro == null) {
            fechaRegistro = LocalDateTime.now();
        }

        if (activo == null) {
            activo = true;
        }
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Short getRol() {
        return rol;
    }

    public boolean esAdministrador() {
        return Short.valueOf((short) 2).equals(rol);
    }

    public void setRol(Short rol) {
        this.rol = rol;
    }

    public Short getCarrera() {
        return carrera;
    }

    public void setCarrera(Short carrera) {
        this.carrera = carrera;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}
