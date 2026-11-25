package py.edu.uc.campus_backend.multiplayer;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.mockito.Mockito.*;

class VehicleServiceTest {
    private final VehicleStore store=mock(VehicleStore.class);
    private final VehicleService service=new VehicleService(store);
    private final ObjectMapper json=new ObjectMapper();
    @Test void acceptsNewParkingPlacesAndRejectsIdsOutsideTheFleet() {
        service.bind(()->true);
        service.handle("driver",json.readTree("{\"type\":\"vehicle.claim\",\"id\":\"raptor-15\"}"));
        service.handle("driver",json.readTree("{\"type\":\"vehicle.claim\",\"id\":\"raptor-16\"}"));
        service.synchronize();verify(store).claim("raptor-15","driver");verify(store,never()).claim(eq("raptor-16"),any());
    }
    @Test void validatesIdsNumbersAndSpeedAndCoalescesFramesBeforeReleasing() {
        service.bind(()->true);
        service.handle("driver",json.readTree("{\"type\":\"vehicle.claim\",\"id\":\"raptor-99\"}"));
        service.handle("driver",json.readTree("{\"type\":\"vehicle.update\",\"id\":\"raptor-0\",\"x\":0,\"y\":0,\"z\":0,\"yaw\":0,\"speed\":300,\"steer\":0}"));
        service.synchronize();verify(store,never()).claim(any(),any());verify(store,never()).move(any(),any(),any());
        for(int i=0;i<100;i++)service.handle("driver",json.readTree("{\"type\":\"vehicle.update\",\"id\":\"raptor-0\",\"x\":"+i+",\"y\":0,\"z\":0,\"yaw\":0,\"speed\":20,\"steer\":0}"));
        service.handle("driver",json.readTree("{\"type\":\"vehicle.release\",\"id\":\"raptor-0\"}"));service.synchronize();
        var order=inOrder(store);order.verify(store).move(eq("raptor-0"),eq("driver"),argThat(p->p.x()==99));order.verify(store).release("driver","raptor-0");
        verify(store,times(1)).move(any(),any(),any());
    }
}
