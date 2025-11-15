import express from "express";
import { v4 as uuid } from "uuid";

const router = express.Router();

router.post("/plivo/incoming", (req, res) => {
  console.log("📞 Incoming Plivo call");
  console.log("Caller:", req.body.From);

  const callId = uuid();
  console.log("🔐 Call ID:", callId);

  const domain = process.env.DOMAIN;
  if (!domain) console.error("❌ Missing DOMAIN in .env");

  const wsUrl = `wss://${domain}/ws/plivo?callId=${callId}`;

  console.log("🌐 Stream URL:", wsUrl);

  const xml = `
<Response>
  <Speak>Connecting you to the assistant.</Speak>
  <Stream
    streamUrl="${wsUrl}"
    streamTimeout="86400"
    keepCallAlive="true"
    bidirectional="true"
    contentType="audio/x-mulaw;rate=8000"
    audioTrack="inbound"
  />
</Response>
`.trim();

  res.set("Content-Type", "text/xml");
  res.send(xml);

  console.log("📡 XML sent to Plivo");
});

export default router;
