package py.edu.uc.tour.chat;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.config.*;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.http.server.*;
import org.springframework.web.socket.server.HandshakeInterceptor;
import java.util.Map;
@Configuration @EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
 @Value("${app.origin}") private String origin;
 @Override public void configureMessageBroker(MessageBrokerRegistry registry){registry.enableSimpleBroker("/topic");registry.setApplicationDestinationPrefixes("/app");}
 @Override public void registerStompEndpoints(StompEndpointRegistry registry){registry.addEndpoint("/ws").setAllowedOrigins(origin).addInterceptors(new HttpSessionHandshakeInterceptor(),new HandshakeInterceptor(){
  public boolean beforeHandshake(ServerHttpRequest req,ServerHttpResponse res,WebSocketHandler h,Map<String,Object> attributes){if(req instanceof ServletServerHttpRequest s){Object token=s.getServletRequest().getAttribute(CsrfToken.class.getName());if(token instanceof CsrfToken t)attributes.put("csrf",t.getToken());}return true;}
  public void afterHandshake(ServerHttpRequest req,ServerHttpResponse res,WebSocketHandler h,Exception e){}
 });}
 @Override public void configureWebSocketTransport(WebSocketTransportRegistration registry){registry.setMessageSizeLimit(4096).setSendBufferSizeLimit(32768).setSendTimeLimit(10000);}
 @Override public void configureClientInboundChannel(ChannelRegistration registration){registration.interceptors(new ChannelInterceptor(){
  @Override public Message<?> preSend(Message<?> message,MessageChannel channel){StompHeaderAccessor a=StompHeaderAccessor.wrap(message);StompCommand command=a.getCommand();if(command==null)return message;
   if(a.getUser()==null)throw new AccessDeniedException("Iniciá sesión.");
   if(command==StompCommand.CONNECT){Object token=a.getSessionAttributes()==null?null:a.getSessionAttributes().get("csrf");String supplied=a.getFirstNativeHeader("X-CSRF-TOKEN");if(token==null||!token.equals(supplied))throw new AccessDeniedException("Token CSRF inválido.");}
   if(command==StompCommand.SEND&&!"/app/chat".equals(a.getDestination()))throw new AccessDeniedException("Destino no permitido.");
   if(command==StompCommand.SUBSCRIBE&&!"/topic/campus".equals(a.getDestination()))throw new AccessDeniedException("Suscripción no permitida.");return message;
  }
 });}
}
