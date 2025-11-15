import { connectToOpenAI } from "./openaiRealtime.js";
import mulaw from "mulaw-js";

export async function handleBridge(plivoWs, req) {
  const url = new URL(req.url, "http://localhost");
  const callId = url.searchParams.get("callId");

  console.log("🔗 Starting WS Bridge for call", callId);

  const openaiWs = await connectToOpenAI(callId);

  let callEnded = false;
  function endCall() {
    if (callEnded) return;
    callEnded = true;

    try { plivoWs.close(); } catch {}
    try { openaiWs.close(); } catch {}

    console.log("🛑 Call ended");
  }

  // ===== PLIVO → OPENAI =====
  plivoWs.on("message", (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }

    // Incoming audio
    if (data.event === "media") {
      openaiWs.send(
        JSON.stringify({
          type: "input_audio_buffer.append",
          audio: data.media.payload,
        })
      );
    }

    // Call hung up
    if (data.event === "stop") {
      endCall();
    }
  });

  // ===== OPENAI → PLIVO =====
  openaiWs.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // AI audio → Convert to μ-law
    if (msg.type === "response.audio.delta") {
      const pcm = Buffer.from(msg.delta, "base64");
      const mulawBuf = mulaw.encode(pcm);
      const mulawB64 = mulawBuf.toString("base64");

      plivoWs.send(
        JSON.stringify({
          event: "media",
          media: { payload: mulawB64 }
        })
      );
    }

    // Whisper transcript
    if (
      msg.type === "conversation.item.input_audio_transcription.completed"
    ) {
      const t = msg.transcript.toLowerCase();
      if (t.includes("bye")) endCall();
    }

    // GPT tool calls
    if (msg.type === "response.function_call") {
      if (msg.name === "hangup_call") endCall();
      if (msg.name === "decline_call") endCall();
    }
  });

  openaiWs.on("close", endCall);
  plivoWs.on("close", endCall);
}
