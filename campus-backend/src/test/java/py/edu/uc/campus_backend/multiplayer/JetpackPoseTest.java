package py.edu.uc.campus_backend.multiplayer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
class JetpackPoseTest {
 private final ObjectMapper json=new ObjectMapper();
 @Test void oldClientsDefaultToInactiveAndFlyingSnapshotsRoundTrip(){
  var old=json.readValue("{\"x\":0,\"y\":0,\"z\":0,\"yaw\":0,\"walking\":false}",PresenceSocket.Pose.class);
  assertFalse(old.jetpacking());
  var pose=new PresenceSocket.Player("p","Ana","azul",1,450,2,0,false,123,false,true);
  var copy=json.readValue(json.writeValueAsString(pose),PresenceSocket.Player.class);
  assertTrue(copy.jetpacking());assertEquals(450,copy.y());
 }
}
