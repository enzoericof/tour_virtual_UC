package py.edu.uc.tour.users;
import jakarta.persistence.*;
@Entity @Table(name="campus_user")
public class CampusUser {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,length=80) private String name;
 @Column(nullable=false,unique=true,length=180) private String email;
 @Column(name="password_hash",nullable=false,length=100) private String passwordHash;
 @Column(nullable=false,length=20) private String role;
 protected CampusUser(){}
 public CampusUser(String name,String email,String hash,String role){this.name=name;this.email=email;this.passwordHash=hash;this.role=role;}
 public Long getId(){return id;}public String getName(){return name;}public String getEmail(){return email;}public String getPasswordHash(){return passwordHash;}public String getRole(){return role;}
}
