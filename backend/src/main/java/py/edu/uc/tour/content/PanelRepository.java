package py.edu.uc.tour.content;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PanelRepository extends JpaRepository<Panel,Long>{List<Panel> findByPlaceIdOrderById(String placeId);}
