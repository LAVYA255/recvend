import express from "express";
import { v4 as uuid } from "uuid";

const router = express.Router();

router.post("/plivo/incoming", (req, res) => {
  console.log("📞 Incoming Plivo webhook");

  const callId = uuid();
  const domain = process.env.DOMAIN;

  const wsUrl = `wss://${domain}/ws/plivo?callId=${callId}`;
  console.log("🌐 WS URL:", wsUrl);

  const xml = `
<Response>
  <Speak>Connecting you to the assistant.</Speak>
  <Stream
    streamUrl="${wsUrl}"
    bidirectional="true"
    keepCallAlive="true"
    streamTimeout="86400"
    contentType="audio/x-mulaw;rate=8000"
    audioTrack="inbound"
  />
</Response>
  `.trim();

  res.set("Content-Type", "text/xml");
  res.send(xml);

  console.log("📡 XML sent to Plivo successfully");
});

export default router;
