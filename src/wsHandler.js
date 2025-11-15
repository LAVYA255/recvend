import { WebSocketServer } from "ws";
import { handleBridge } from "./wsBridge.js";

export function handleWsUpgrade(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    console.log("🔄 WS upgrade:", req.url);

    if (req.url.startsWith("/ws/plivo")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    console.log("🔌 Plivo WS connected");
    handleBridge(ws, req);
  });
}
