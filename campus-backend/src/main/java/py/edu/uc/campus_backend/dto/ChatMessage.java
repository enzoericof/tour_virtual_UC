package py.edu.uc.campus_backend.dto;

public record ChatMessage(String id, long userId, String name, String text, long sentAt) {}
