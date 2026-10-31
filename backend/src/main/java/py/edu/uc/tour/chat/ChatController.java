package py.edu.uc.tour.chat;
import org.springframework.stereotype.Controller;
import org.springframework.messaging.handler.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.time.Instant;
import py.edu.uc.tour.users.UserService;
@Controller
public class ChatController {
 private final UserService users;public ChatController(UserService users){this.users=users;}
 public record Input(@NotBlank @Size(max=500) String text){}
 public record Output(String name,String text,Instant sentAt){}
 @MessageMapping("/chat") @SendTo("/topic/campus") public Output message(@Valid Input input,Principal principal){return new Output(users.require(principal.getName()).getName(),input.text().trim(),Instant.now());}
}
