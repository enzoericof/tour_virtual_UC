import type { Player } from "./presence";
export type Emote = "ok" | "peace" | "ragdoll";
export type PairGesture = "high-five" | "hold-hands";
export type Gesture = Emote | PairGesture;
export type ChatMessage = {
  id: string;
  userId: number;
  name: string;
  text: string;
  sentAt: number;
};
export type SocialAction = {
  id: string;
  kind: Gesture;
  from: string;
  to: string | null;
  fromName: string;
  toName: string | null;
  fromPose: Player;
  toPose: Player | null;
  status: "pending" | "active" | "declined" | "cancelled" | "expired";
  startedAt: number;
  expiresAt: number;
};
export type SocialEvent = {
  type: string;
  message?: ChatMessage | string;
  messages?: ChatMessage[];
  action?: SocialAction;
  more?: boolean;
  serverNow?: number;
};
export const gestureNames: Record<Gesture, string> = {
  "high-five": "Chocar los cinco",
  "hold-hands": "Tomarse de las manos y saltar",
  ok: "Señal de OK",
  peace: "Señal de paz",
  ragdoll: "Caerse",
};
export function recentMessages(messages: Iterable<ChatMessage>, now: number) {
  return [...messages]
    .filter((m) => m.sentAt > now - 300000)
    .sort((a, b) => a.sentAt - b.sentAt || a.id.localeCompare(b.id));
}
