import { connectToOpenAI } from "./openaiRealtime.js";

export async function handleBridge(plivoWs, req) {
  const url = new URL(req.url, "http://localhost");
  const callId = url.searchParams.get("callId") || "unknown";

  console.log("🔗 Starting WS bridge for call:", callId);

  const openaiWs = await connectToOpenAI(callId);

  let callEnded = false;
  const endCall = () => {
    if (callEnded) return;
    callEnded = true;

    console.log("🛑 Ending call:", callId);

    try {
      if (plivoWs.readyState === plivoWs.OPEN) plivoWs.close();
    } catch {}
    try {
      if (openaiWs.readyState === openaiWs.OPEN) openaiWs.close();
    } catch {}
  };

  // ============= Plivo → OpenAI =============
  plivoWs.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch (e) {
      console.error("⚠️ Failed to parse Plivo WS message", e);
      return;
    }

    // Media frames from Plivo (base64 audio)
    if (data.event === "media") {
      const audioB64 = data.media.payload;

      if (openaiWs.readyState === openaiWs.OPEN) {
        openaiWs.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: audioB64,
          })
        );
      }
    }

    // Plivo indicates the call has stopped
    if (data.event === "stop") {
      console.log("📴 Plivo sent stop for call:", callId);

      if (openaiWs.readyState === openaiWs.OPEN) {
        openaiWs.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      }

      endCall();
    }
  });

  // ============= OpenAI → Plivo =============
  openaiWs.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      console.error("⚠️ Failed to parse OpenAI WS message", e);
      return;
    }

    const type = msg.type;

    // Model's audio output (assistant speaking)
    if (type === "response.audio.delta") {
      const audioDelta = msg.delta; // base64
      if (plivoWs.readyState === plivoWs.OPEN) {
        plivoWs.send(
          JSON.stringify({
            event: "media",
            media: { payload: audioDelta },
          })
        );
      }
    }

    // Caller input transcription completed
    if (type === "conversation.item.input_audio_transcription.completed") {
      const transcript = (msg.transcript || "").toLowerCase();
      console.log("🗣️ Caller transcript:", transcript);

      if (
        transcript.includes("bye") ||
        transcript.includes("goodbye") ||
        transcript.includes("ok bye") ||
        transcript.includes("okay bye") ||
        transcript.includes("thanks bye")
      ) {
        console.log("👋 Detected caller saying bye, ending call");
        endCall();
      }
    }

    // Log errors from OpenAI side
    if (type === "error") {
      console.error("❌ OpenAI Realtime error event:", msg);
    }
  });

  // ============= Cleanup (both sides) =============
  plivoWs.on("close", () => {
    console.log("📴 Plivo WS closed for call:", callId);
    endCall();
  });

  openaiWs.on("close", () => {
    console.log("🔌 OpenAI WS closed for call:", callId);
    endCall();
  });

  plivoWs.on("error", (err) => {
    console.error("⚠️ Plivo WS error:", err);
    endCall();
  });

  openaiWs.on("error", (err) => {
    console.error("⚠️ OpenAI WS error:", err);
    endCall();
  });
}
