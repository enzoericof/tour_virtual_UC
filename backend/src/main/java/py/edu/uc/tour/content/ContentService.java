package py.edu.uc.tour.content;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import py.edu.uc.tour.users.*;
import java.net.URI;
import java.util.List;
@Service
public class ContentService {
 private final WorkRepository works;private final PanelRepository panels;private final UserService users;
 public ContentService(WorkRepository works,PanelRepository panels,UserService users){this.works=works;this.panels=panels;this.users=users;}
 public record WorkView(Long id,String title,String description,String url,String author,Long ownerId){static WorkView of(Work w){return new WorkView(w.id,w.title,w.description,w.url,w.owner.getName(),w.owner.getId());}}
 public record PanelView(Long id,String placeId,String title,String body,String url){static PanelView of(Panel p){return new PanelView(p.id,p.placeId,p.title,p.body,p.url);}}
 public static String checkedUrl(String value,boolean optional){if(value==null||value.isBlank()){if(optional)return "";throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ingresá un enlace válido.");}try{URI u=URI.create(value.trim());if(!List.of("http","https").contains(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null)throw new IllegalArgumentException();return u.toString();}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"El enlace debe comenzar con http:// o https://.");}}
 @Transactional(readOnly=true) public List<WorkView> works(){return works.findTop100ByOrderByCreatedAtDesc().stream().map(WorkView::of).toList();}
 @Transactional public WorkView publish(String email,String title,String description,String url){return WorkView.of(works.save(new Work(title.trim(),description.trim(),checkedUrl(url,false),users.require(email))));}
 @Transactional public void deleteWork(Long id,String email){Work work=works.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));if(!work.owner.getId().equals(users.require(email).getId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN);works.delete(work);}
 @Transactional public WorkView updateWork(Long id,String email,String title,String description,String url){Work work=works.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));if(!work.owner.getId().equals(users.require(email).getId()))throw new ResponseStatusException(HttpStatus.FORBIDDEN);work.title=title.trim();work.description=description.trim();work.url=checkedUrl(url,false);return WorkView.of(works.save(work));}
 @Transactional(readOnly=true) public List<PanelView> panels(String placeId){return (placeId==null?panels.findAll():panels.findByPlaceIdOrderById(placeId)).stream().map(PanelView::of).toList();}
 @Transactional public PanelView savePanel(Long id,String placeId,String title,String body,String url){Panel p=id==null?new Panel():panels.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));p.placeId=placeId;p.title=title.trim();p.body=body.trim();p.url=checkedUrl(url,true);return PanelView.of(panels.save(p));}
 @Transactional public void deletePanel(Long id){if(!panels.existsById(id))throw new ResponseStatusException(HttpStatus.NOT_FOUND);panels.deleteById(id);}
}
