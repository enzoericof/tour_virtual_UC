package py.edu.uc.campus_backend.multiplayer;

/** Color estable por cuenta, asignado exclusivamente por el servidor. */
public final class AvatarColor {
    private AvatarColor() {}
    public static String forUser(long id) {
        double hue = ((id * 0.618033988749895) % 1) * 6;
        double x = 1 - Math.abs(hue % 2 - 1);
        double[] rgb = switch ((int) hue) {
            case 0 -> new double[]{1, x, 0}; case 1 -> new double[]{x, 1, 0};
            case 2 -> new double[]{0, 1, x}; case 3 -> new double[]{0, x, 1};
            case 4 -> new double[]{x, 0, 1}; default -> new double[]{1, 0, x};
        };
        return String.format("#%02x%02x%02x", (int)((rgb[0] * .46 + .22) * 255),
            (int)((rgb[1] * .46 + .22) * 255), (int)((rgb[2] * .46 + .22) * 255));
    }
}
