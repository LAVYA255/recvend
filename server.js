import "dotenv/config.js";
import express from "express";
import http from "http";
import plivoRoute from "./src/plivoRoute.js";
import { handleWsUpgrade } from "./src/wsHandler.js";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use("/", plivoRoute);

app.get("/", (req, res) => {
  res.send("Lav's Plivo + OpenAI Realtime AI Assistant is running.");
});

const server = http.createServer(app);
handleWsUpgrade(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server live on port ${PORT}`);
});
