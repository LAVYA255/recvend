import express from "express";
import { v4 as uuid } from "uuid";

const router = express.Router();

router.post("/plivo/incoming", (req, res) => {
  console.log("📞 /plivo/incoming HIT");
  console.log("Caller Number:", req.body.From);

  const callId = uuid();
  console.log("🔐 Generated Call ID:", callId);

  const domain = process.env.DOMAIN;
  if (!domain) {
    console.error("❌ DOMAIN missing in .env");
  }

  const wsUrl = `wss://${domain}/ws/plivo?callId=${callId}`;
  console.log("🌐 Stream URL:", wsUrl);

  const xml = `
<Response>
  <Speak>Connecting you to the assistant.</Speak>
  <Stream 
    streamTimeout="86400"
    keepCallAlive="true"
    bidirectional="true"
    contentType="audio/x-mulaw;rate=8000"
    audioTrack="inbound"
  >
  ${wsUrl}
  </Stream>
</Response>
`.trim();

  res.set("Content-Type", "text/xml");
  res.send(xml);

  console.log("📡 Responded with Stream XML + enhanced attributes");
});

export default router;
