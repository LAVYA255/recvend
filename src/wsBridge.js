import { connectToOpenAI } from "./openaiRealtime.js";
import mulaw from "mulaw-js";   // npm install mulaw-js

export async function handleBridge(plivoWs, req) {
  const url = new URL(req.url, "http://localhost");
  const callId = url.searchParams.get("callId");

  console.log("🔗 WS Bridge started for call:", callId);

  const openaiWs = await connectToOpenAI(callId);

  let callEnded = false;
  const endCall = () => {
    if (callEnded) return;
    callEnded = true;
    console.log("🛑 Ending call:", callId);

    try { plivoWs.close(); console.log("📴 Plivo WS closed"); } catch {}
    try { openaiWs.close(); console.log("🔌 OpenAI WS closed"); } catch {}
  };

  // ==================================================
  // Plivo → OpenAI (Caller audio)
  // ==================================================
  plivoWs.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("⚠️ Failed parsing Plivo message");
      return;
    }

    if (data.event === "media") {
      const audioB64 = data.media.payload;
      openaiWs.send(JSON.stringify({
        type: "input_audio_buffer.append",
        audio: audioB64,
      }));
    }

    if (data.event === "stop") {
      console.log("📴 Plivo STOP event");
      openaiWs.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      endCall();
    }
  });

  // ==================================================
  // OpenAI → Plivo (AI audio)
  // ==================================================
  openaiWs.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // AI sends PCM16 — convert to μ-law
    if (msg.type === "response.audio.delta") {
      const pcm = Buffer.from(msg.delta, "base64");
      const mulawBuf = mulaw.encode(pcm); 
      const mulawB64 = mulawBuf.toString("base64");

      plivoWs.send(JSON.stringify({
        event: "media",
        media: { payload: mulawB64 },
      }));
    }

    // Whisper transcription
    if (msg.type === "conversation.item.input_audio_transcription.completed") {
      const transcript = msg.transcript.toLowerCase();
      console.log("📝 Whisper:", transcript);

      if (transcript.includes("bye")) {
        console.log("👋 Caller said bye");
        endCall();
      }
    }

    // GPT Tools
    if (msg.type === "response.function_call") {
      if (msg.name === "hangup_call") {
        console.log("👋 AI triggered hangup_call");
        endCall();
      }
      if (msg.name === "decline_call") {
        console.log("❌ AI triggered decline_call");
        endCall();
      }
    }
  });

  plivoWs.on("close", endCall);
  openaiWs.on("close", endCall);
}
