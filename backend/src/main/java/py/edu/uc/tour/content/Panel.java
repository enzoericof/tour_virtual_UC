package py.edu.uc.tour.content;
import jakarta.persistence.*;
@Entity @Table(name="panel")
public class Panel {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
 @Column(name="place_id",nullable=false,length=80) String placeId;
 @Column(nullable=false,length=140) String title;
 @Column(nullable=false,length=5000) String body;
 @Column(nullable=false,length=2048) String url="";
 protected Panel(){}
}
