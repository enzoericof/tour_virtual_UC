package py.edu.uc.campus_backend.multiplayer;

import py.edu.uc.campus_backend.dto.SocialAction;

import py.edu.uc.campus_backend.dto.ChatMessage;

import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SocialServiceTest {
    final ObjectMapper json=new ObjectMapper();
    @Test void messagesRemainInRamForExactlyFiveMinutesAndArchiveRetriesWithoutLosingThem() {
        var recent=new RecentChat();var saved=new ArrayList<ChatMessage>();
        var archive=new ChatArchive(null){@Override public void save(ChatMessage m){saved.add(m);}};
        var message=new ChatMessage(UUID.randomUUID().toString(),1,"Ana","Hola",1000);
        assertTrue(recent.add(message,1000));assertFalse(recent.add(message,1000));
        recent.archive(archive,300999);assertTrue(saved.isEmpty());assertEquals(1,recent.recent(300999).size());
        var broken=new ChatArchive(null){@Override public void save(ChatMessage m){throw new RuntimeException("offline");}};
        assertThrows(RuntimeException.class,()->recent.archive(broken,301000));
        assertTrue(recent.recent(301000).isEmpty()); // No se expone como mensaje reciente.
        recent.archive(archive,301001);assertEquals(List.of(message),saved);
        recent.archive(archive,301002);assertEquals(1,saved.size());
    }
    @Test void facingAndProximityRejectSelfDistantPeopleAndDifferentFloors() {
        var a=new PresenceSocket.Player("a","Ana","azul",0,0,0,0,false);
        assertTrue(SocialActions.close(a,new PresenceSocket.Player("b","Beto","azul",0,0,-1,0,false),true));
        assertFalse(SocialActions.close(a,new PresenceSocket.Player("b","Beto","azul",0,0,1,0,false),true));
        assertFalse(SocialActions.close(a,new PresenceSocket.Player("b","Beto","azul",0,0,-3,0,false),true));
        assertFalse(SocialActions.close(a,new PresenceSocket.Player("b","Beto","azul",0,3,-1,0,false),false));
        assertFalse(SocialActions.close(a,a,false));
    }
    @Test void chatIdentityComesFromSessionAndHistoryIsNotFetchedBySync() {
        var archive=mock(ChatArchive.class);var actions=mock(SocialActions.class);var relay=mock(SocialRelay.class);
        var service=new SocialService(new RecentChat(),archive,actions,relay,json);
        var events=new ArrayList<Object>();service.bind((ids,event)->events.add(event));
        service.handle("p",7,"Nombre real",json.readTree("{\"type\":\"chat.send\",\"text\":\"Hola\",\"name\":\"Falso\",\"userId\":99}"));
        var message=org.mockito.ArgumentCaptor.forClass(Map.class);verify(relay).send(message.capture());
        var body=(ChatMessage)message.getValue().get("message");
        assertEquals(7,body.userId());assertEquals("Nombre real",body.name());
        service.handle("other",8,"Otro",json.readTree("{\"type\":\"social.sync\"}"));
        verifyNoInteractions(archive);
        assertTrue(events.stream().anyMatch(e->e.toString().contains("chat.recent")));
    }
    @Test void blanksOversizedMessagesWhispersAndUnknownEmotesNeverReachTheRelay() {
        var archive=mock(ChatArchive.class);var actions=mock(SocialActions.class);var relay=mock(SocialRelay.class);
        var service=new SocialService(new RecentChat(),archive,actions,relay,json);
        for(String text:List.of(" ","x".repeat(501)))service.handle(UUID.randomUUID().toString(),7,"Ana",json.valueToTree(Map.of("type","chat.send","text",text)));
        service.handle("w",7,"Ana",json.readTree("{\"type\":\"chat.whisper\",\"text\":\"Hola\"}"));
        verify(relay,never()).send(any());verifyNoInteractions(archive);
    }
    @Test void colorIsStablePerAccountAndDistinctForTheTenFirstUsers() {
        var colors=new HashSet<String>();for(long i=1;i<=10;i++){assertEquals(AvatarColor.forUser(i),AvatarColor.forUser(i));colors.add(AvatarColor.forUser(i));}
        assertEquals(10,colors.size());
    }
    @Test void onlyRecipientCanAcceptAndExpiredConsentNeverUpdatesTheDatabase() {
        var jdbc=mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var id=UUID.randomUUID().toString();var from=UUID.randomUUID().toString();var to=UUID.randomUUID().toString();
        var pose=new PresenceSocket.Player(from,"Ana","azul",0,0,0,0,false);
        var action=new SocialAction(id,"high-five",from,to,"Ana","Beto",pose,pose,"pending",1000,13000);
        doReturn(List.of(action)).when(jdbc).query(contains("FOR UPDATE"),org.mockito.ArgumentMatchers.<org.springframework.jdbc.core.RowMapper<SocialAction>>any(),eq(id));
        var store=new SocialActions(jdbc,json);
        assertThrows(IllegalArgumentException.class,()->store.respond(from,id,true,false,2000));
        assertThrows(IllegalArgumentException.class,()->store.respond("intruso",id,true,false,2000));
        assertThrows(IllegalArgumentException.class,()->store.respond(to,id,true,false,13000));
        verify(jdbc,never()).update(anyString(),org.mockito.ArgumentMatchers.<Object[]>any());
    }
    @Test void idleInstancesDoNotPollTablesOrKeepAnEmptyChatAlive() {
        var archive=mock(ChatArchive.class);var actions=mock(SocialActions.class);var relay=mock(SocialRelay.class);
        var recent=new RecentChat();var service=new SocialService(recent,archive,actions,relay,json);
        service.bind((ids,event)->{},()->false);service.maintain();
        verifyNoInteractions(archive,actions);assertFalse(recent.hasPending());
    }
}
