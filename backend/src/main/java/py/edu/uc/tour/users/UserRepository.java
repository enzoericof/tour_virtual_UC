package py.edu.uc.tour.users;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface UserRepository extends JpaRepository<CampusUser,Long>{Optional<CampusUser> findByEmail(String email);boolean existsByEmail(String email);}
