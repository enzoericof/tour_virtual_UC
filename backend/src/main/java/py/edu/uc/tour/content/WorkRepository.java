package py.edu.uc.tour.content;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface WorkRepository extends JpaRepository<Work,Long>{List<Work> findTop100ByOrderByCreatedAtDesc();}
