import { connectToOpenAI } from "./openaiRealtime.js";

export async function handleBridge(plivoWs, req) {
  const url = new URL(req.url, "http://localhost");
  const callId = url.searchParams.get("callId");

  console.log("🔗 WS Bridge INIT for call:", callId);

  const openaiWs = await connectToOpenAI(callId);

  let callEnded = false;

  const endCall = () => {
    if (callEnded) return;
    callEnded = true;

    console.log("🛑 ENDING CALL:", callId);

    try { plivoWs.close(); console.log("📴 Plivo WS closed"); } catch {}
    try { openaiWs.close(); console.log("🔌 OpenAI WS closed"); } catch {}
  };

  // =======================
  // Plivo → OpenAI
  // =======================
  plivoWs.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error("⚠️ Failed to parse Plivo WS message");
      return;
    }

    if (data.event === "media") {
      const audioB64 = data.media.payload;
      console.log("🎧 Received audio from caller (size:", audioB64.length, ")");

      openaiWs.send(
        JSON.stringify({
          type: "input_audio_buffer.append",
          audio: audioB64,
        })
      );
    }

    if (data.event === "stop") {
      console.log("📴 Plivo sent STOP event — caller hung up");
      openaiWs.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      endCall();
    }
  });

  // =======================
  // OpenAI → Plivo
  // =======================
  openaiWs.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.error("⚠️ Could not parse OpenAI message");
      return;
    }

    // AI Voice Output
    if (msg.type === "response.audio.delta") {
      console.log("🗣️ Sending AI voice to Plivo (delta)");
      plivoWs.send(
        JSON.stringify({
                                        event: "playAudio",
                                        media: {
                                            contentType: "audio/x-mulaw",
                                            sampleRate: 8000,
                                            payload: msg.delta,
                                        },
                                    })
      );
    }

    // Whisper transcript
    if (msg.type === "conversation.item.input_audio_transcription.completed") {
      const transcript = msg.transcript.toLowerCase();
      console.log("📝 Whisper Transcript:", transcript);

      if (
        transcript.includes("bye") ||
        transcript.includes("goodbye") ||
        transcript.includes("ok bye")
      ) {
        console.log("👋 Caller said BYE — ending call");
        endCall();
      }
    }

    // GPT Tool Calls
    if (msg.type === "response.function_call") {
      console.log("🛠️ GPT Tool Call:", msg.name);

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

  plivoWs.on("close", () => {
    console.log("📴 Plivo WS CLOSED by network");
    endCall();
  });

  openaiWs.on("close", () => {
    console.log("🔌 OpenAI WS CLOSED event");
    endCall();
  });

  plivoWs.on("error", (e) => {
    console.error("⚠️ Plivo WS ERROR:", e);
    endCall();
  });

  openaiWs.on("error", (e) => {
    console.error("⚠️ OpenAI WS ERROR:", e);
    endCall();
  });
}
