package py.edu.uc.campus_backend.dto;

import py.edu.uc.campus_backend.multiplayer.PresenceSocket;

public record SocialAction(String id, String kind, String from, String to, String fromName, String toName,
    PresenceSocket.Player fromPose, PresenceSocket.Player toPose, String status, long startedAt, long expiresAt) {}
