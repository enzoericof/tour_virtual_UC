package py.edu.uc.campus_backend.multiplayer;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BooleanSupplier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import py.edu.uc.campus_backend.dto.VehicleState;
import tools.jackson.databind.JsonNode;

@Service
public class VehicleService {
    private record Command(String driver,String type,String id) {}
    private record Movement(String driver,VehicleState pose) {}
    private final VehicleStore store;
    private final ArrayBlockingQueue<Command> commands=new ArrayBlockingQueue<>(64);
    private final Map<String,Movement> movements=new ConcurrentHashMap<>();
    private volatile List<VehicleState> states=List.of();
    private BooleanSupplier active=()->false;
    public VehicleService(VehicleStore store){this.store=store;}
    public void bind(BooleanSupplier active){this.active=active;}
    public List<VehicleState> snapshot(){return states;}
    public void leave(String driver){commands.offer(new Command(driver,"vehicle.release",null));}
    public void handle(String driver,JsonNode node) {
        String type=node.path("type").asText(),id=node.path("id").asText();
        if(!id.matches("raptor-[0-7]"))return;
        if(type.equals("vehicle.update")) {
            for(String key:List.of("x","y","z","yaw","speed","steer"))if(!node.path(key).isNumber()||!Double.isFinite(node.path(key).asDouble()))return;
            double x=node.path("x").asDouble(),y=node.path("y").asDouble(),z=node.path("z").asDouble(),yaw=node.path("yaw").asDouble(),speed=node.path("speed").asDouble(),steer=node.path("steer").asDouble();
            if(Math.abs(x)>1000||Math.abs(z)>1000||Math.abs(y)>100||Math.abs(yaw)>Math.PI+.001||speed>34.01||speed< -7.01||Math.abs(steer)>.58)return;
            // Un último movimiento por visitante, nunca una cola creciente por cuadro.
            movements.put(driver,new Movement(driver,new VehicleState(id,x,y,z,yaw,speed,steer,driver,0)));
        }else if(type.equals("vehicle.claim")||type.equals("vehicle.release"))commands.offer(new Command(driver,type,id));
    }
    @Scheduled(fixedDelay=100,scheduler="presenceSync")
    public void synchronize() {
        if(!active.getAsBoolean()&&commands.isEmpty()&&movements.isEmpty())return;
        for(var entry:movements.entrySet())if(movements.remove(entry.getKey(),entry.getValue())) {
            var movement=entry.getValue();store.move(movement.pose.id(),movement.driver,movement.pose);
        }
        Command command;int budget=64;
        while(budget-->0&&(command=commands.poll())!=null) {
            if(command.type.equals("vehicle.claim"))store.claim(command.id,command.driver);
            else store.release(command.driver,command.id);
        }
        states=store.snapshot();
    }
}
