import { Client } from "@stomp/stompjs";
import { refreshCsrf } from "./api";
export type ChatMessage = { name: string; text: string; sentAt: string };
export class CampusChat {
  private client: Client | null = null;
  async connect(
    onMessage: (m: ChatMessage) => void,
    onStatus: (s: string) => void,
  ) {
    await this.disconnect();
    const csrf = await refreshCsrf();
    const c = new Client({
      brokerURL: `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
      connectHeaders: { [csrf.headerName]: csrf.token },
      reconnectDelay: 0,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });
    this.client = c;
    c.onConnect = () => {
      onStatus("Conectado");
      c.subscribe("/topic/campus", (m) =>
        onMessage(JSON.parse(m.body) as ChatMessage),
      );
    };
    c.onStompError = () =>
      onStatus("No se pudo conectar. Volvé a iniciar sesión.");
    c.onWebSocketClose = () => onStatus("Desconectado");
    c.activate();
  }
  send(text: string) {
    if (!this.client?.connected)
      throw new Error("El chat todavía no está conectado.");
    this.client.publish({
      destination: "/app/chat",
      body: JSON.stringify({ text }),
    });
  }
  async disconnect() {
    if (this.client) await this.client.deactivate();
    this.client = null;
  }
}
