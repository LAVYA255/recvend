import { WebSocketServer } from "ws";
import { handleBridge } from "./wsBridge.js";

export function handleWsUpgrade(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url.startsWith("/ws/plivo")) {
      console.log("🔄 Upgrading to Plivo WebSocket:", req.url);
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      console.log("❌ Unknown WS path:", req.url);
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    console.log("🔌 Plivo WS connected");
    handleBridge(ws, req);
  });
}
