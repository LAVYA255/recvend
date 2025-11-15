import WebSocket from "ws";

export function connectToOpenAI(callId) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY missing in .env");
      reject(new Error("Missing OPENAI_API_KEY"));
      return;
    }

    const model = "gpt-4o-realtime-preview";

    const ws = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${model}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      }
    );

    ws.on("open", () => {
      console.log("🧠 OpenAI Realtime connected for call:", callId);

      const instructions =
        process.env.AI_ASSISTANT_PROMPT ||
        "You are a friendly phone assistant.";

      // Configure realtime session
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions,
            modalities: ["audio", "text"],
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            voice: "cedar", // or 'alloy' if cedar isn't available

            // Enable server VAD so model auto-detects turns & responds
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              silence_duration_ms: 500,
            },

            // Enable transcription of caller input (Whisper-like)
            input_audio_transcription: {
              model: "whisper-1",
            },
          },
        })
      );

      resolve(ws);
    });

    ws.on("error", (err) => {
      console.error("❌ OpenAI WS error:", err);
      reject(err);
    });
  });
}
