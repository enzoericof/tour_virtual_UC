package py.edu.uc.tour.content;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.*;
@RestController @RequestMapping("/api/v1")
public class ContentController {
 private final ContentService content;public ContentController(ContentService content){this.content=content;}
 public record WorkInput(@NotBlank @Size(max=140) String title,@NotBlank @Size(max=2000) String description,@NotBlank @Size(max=2048) String url){}
 public record PanelInput(@NotBlank @Pattern(regexp="[a-z0-9-]{1,80}") String placeId,@NotBlank @Size(max=140) String title,@NotBlank @Size(max=5000) String body,@Size(max=2048) String url){}
 @GetMapping("/health") public Map<String,String> health(){return Map.of("status","ok","version","0.1.0");}
 @GetMapping("/works") public List<ContentService.WorkView> works(){return content.works();}
 @PostMapping("/works") @ResponseStatus(org.springframework.http.HttpStatus.CREATED) public ContentService.WorkView publish(@Valid @RequestBody WorkInput w,Authentication auth){return content.publish(auth.getName(),w.title(),w.description(),w.url());}
 @DeleteMapping("/works/{id}") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) public void deleteWork(@PathVariable Long id,Authentication auth){content.deleteWork(id,auth.getName());}
 @PutMapping("/works/{id}") public ContentService.WorkView updateWork(@PathVariable Long id,@Valid @RequestBody WorkInput w,Authentication auth){return content.updateWork(id,auth.getName(),w.title(),w.description(),w.url());}
 @GetMapping("/panels") public List<ContentService.PanelView> panels(@RequestParam(required=false) String placeId){return content.panels(placeId);}
 @PostMapping("/panels") @PreAuthorize("hasRole('ADMIN')") @ResponseStatus(org.springframework.http.HttpStatus.CREATED) public ContentService.PanelView create(@Valid @RequestBody PanelInput p){return content.savePanel(null,p.placeId(),p.title(),p.body(),p.url());}
 @PutMapping("/panels/{id}") @PreAuthorize("hasRole('ADMIN')") public ContentService.PanelView update(@PathVariable Long id,@Valid @RequestBody PanelInput p){return content.savePanel(id,p.placeId(),p.title(),p.body(),p.url());}
 @DeleteMapping("/panels/{id}") @PreAuthorize("hasRole('ADMIN')") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) public void deletePanel(@PathVariable Long id){content.deletePanel(id);}
}
