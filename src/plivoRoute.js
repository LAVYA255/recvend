import express from "express";
import { v4 as uuid } from "uuid";

const router = express.Router();

/**
 * Plivo Answer URL
 * Method: POST
 * Path:   /plivo/incoming
 *
 * On incoming call, Plivo will POST here.
 * We respond with XML that tells Plivo to start a bidirectional audio Stream
 * to our WebSocket endpoint: wss://DOMAIN/ws/plivo?callId=...
 */
router.post("/plivo/incoming", (req, res) => {
  const callId = uuid();

  console.log("📞 New incoming Plivo call:", callId);

  const domain = process.env.DOMAIN;
  if (!domain) {
    console.error("❌ DOMAIN not set in .env");
  }

  const wsUrl = `wss://${domain}/ws/plivo?callId=${callId}`;

  const xml = `
<Response>
  <Speak>Connecting you to the assistant.</Speak>
  <Stream bidirectional="true" audioTrack="outbound" streamUrl="${wsUrl}" />
</Response>
`.trim();

  res.set("Content-Type", "text/xml");
  res.send(xml);
});

export default router;
