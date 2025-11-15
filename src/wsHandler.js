import { WebSocketServer } from "ws";
import { handleBridge } from "./wsBridge.js";

export function handleWsUpgrade(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = req.url || "";

    if (url.startsWith("/ws/plivo")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    console.log("🔌 WebSocket connection established for", req.url);
    handleBridge(ws, req);
  });
}
