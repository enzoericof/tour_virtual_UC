package py.edu.uc.tour;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import py.edu.uc.tour.users.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.assertj.core.api.Assertions.assertThat;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:tests;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1","spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password="})
@AutoConfigureMockMvc
class ApiIntegrationTest {
 @Autowired MockMvc mvc;@Autowired UserService users;@Autowired UserRepository repository;@Autowired PasswordEncoder encoder;
 @Test void publicContentAndAuthenticationBoundary() throws Exception {mvc.perform(get("/api/v1/panels?placeId=laboratorio")).andExpect(status().isOk()).andExpect(jsonPath("$[0].placeId").value("laboratorio"));mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());mvc.perform(post("/api/v1/works").contentType("application/json").content("{}" )).andExpect(status().isForbidden());}
 @Test void registrationLoginSessionAndLogout() throws Exception {
  mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content("{\"name\":\"Prueba\",\"email\":\"session@example.test\",\"password\":\"una-clave-de-prueba\"}")).andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("USER")).andExpect(jsonPath("$.passwordHash").doesNotExist());
  assertThat(users.require("session@example.test").getPasswordHash()).doesNotContain("una-clave");
  var result=mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"session@example.test\",\"password\":\"una-clave-de-prueba\"}")).andExpect(status().isOk()).andReturn();
  var session=(MockHttpSession)result.getRequest().getSession(false);mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Prueba"));
  mvc.perform(post("/api/v1/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());assertThat(session.isInvalid()).isTrue();
 }
 @Test void ownershipAndUnsafeLinks() throws Exception {
  users.register("Autora","owner@example.test","una-clave-de-prueba");users.register("Otro","other@example.test","una-clave-de-prueba");
  var result=mvc.perform(post("/api/v1/works").with(user("owner@example.test")).with(csrf()).contentType("application/json").content("{\"title\":\"Trabajo\",\"description\":\"Ejemplo\",\"url\":\"https://example.org/proyecto\"}")).andExpect(status().isCreated()).andReturn();
  var json=new tools.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString());long id=json.get("id").asLong();
  mvc.perform(delete("/api/v1/works/"+id).with(user("other@example.test")).with(csrf())).andExpect(status().isForbidden());
  String update="{\"title\":\"Trabajo actualizado\",\"description\":\"Descripción actualizada\",\"url\":\"https://example.org/nuevo\"}";
  mvc.perform(put("/api/v1/works/"+id).with(user("other@example.test")).with(csrf()).contentType("application/json").content(update)).andExpect(status().isForbidden());
  mvc.perform(put("/api/v1/works/"+id).with(user("owner@example.test")).with(csrf()).contentType("application/json").content(update)).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Trabajo actualizado"));
  mvc.perform(post("/api/v1/works").with(user("owner@example.test")).with(csrf()).contentType("application/json").content("{\"title\":\"Inseguro\",\"description\":\"Ejemplo\",\"url\":\"javascript:alert(1)\"}")).andExpect(status().isBadRequest());
  mvc.perform(delete("/api/v1/works/"+id).with(user("owner@example.test")).with(csrf())).andExpect(status().isNoContent());
 }
 @Test void onlyAdministratorsManagePanels() throws Exception {
  String body="{\"placeId\":\"test\",\"title\":\"Panel\",\"body\":\"Contenido\",\"url\":\"\"}";
  mvc.perform(post("/api/v1/panels").with(user("student").roles("USER")).with(csrf()).contentType("application/json").content(body)).andExpect(status().isForbidden());
  mvc.perform(post("/api/v1/panels").with(user("admin").roles("ADMIN")).with(csrf()).contentType("application/json").content(body)).andExpect(status().isCreated());
 }
 @Test void duplicateAndShortPasswordAreRejected() throws Exception {
  users.register("Duplicado","duplicate@example.test","una-clave-de-prueba");
  mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content("{\"name\":\"Otro\",\"email\":\"DUPLICATE@example.test\",\"password\":\"una-clave-de-prueba\"}")).andExpect(status().isConflict());
  mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content("{\"name\":\"Otro\",\"email\":\"short@example.test\",\"password\":\"123\"}")).andExpect(status().isBadRequest());
 }
}
