import { WebSocketServer } from "ws";
import { handleBridge } from "./wsBridge.js";

export function handleWsUpgrade(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    console.log("🔄 WS Upgrade request:", req.url);

    if (req.url.startsWith("/ws/plivo")) {
      console.log("🟢 Upgrading to Plivo WS");

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });

    } else {
      console.log("🔴 Unknown WS path. Closing.");
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    console.log("🔌 Plivo WS connected:", req.url);
    handleBridge(ws, req);
  });
}
