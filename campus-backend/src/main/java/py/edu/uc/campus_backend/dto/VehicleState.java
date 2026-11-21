package py.edu.uc.campus_backend.dto;

/** Pose compartida en metros; driver es el id de presencia que posee la reserva. */
public record VehicleState(String id, double x, double y, double z, double yaw,
        double speed, double steer, String driver, long at) {}
