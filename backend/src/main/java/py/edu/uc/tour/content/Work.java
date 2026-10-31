package py.edu.uc.tour.content;
import jakarta.persistence.*;
import py.edu.uc.tour.users.CampusUser;
import java.time.Instant;
@Entity @Table(name="work")
public class Work {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
 @Column(nullable=false,length=140) String title;
 @Column(nullable=false,length=2000) String description;
 @Column(nullable=false,length=2048) String url;
 @ManyToOne(fetch=FetchType.EAGER,optional=false) @JoinColumn(name="owner_id") CampusUser owner;
 @Column(name="created_at",nullable=false) Instant createdAt=Instant.now();
 protected Work(){} public Work(String title,String description,String url,CampusUser owner){this.title=title;this.description=description;this.url=url;this.owner=owner;}
}
