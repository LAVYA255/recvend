import WebSocket from "ws";

export function connectToOpenAI(callId) {
  return new Promise((resolve, reject) => {
    console.log("🔗 Connecting to OpenAI Realtime for call:", callId);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY missing");
      return reject(new Error("Missing OPENAI_API_KEY"));
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
      console.log("🧠 OpenAI Realtime CONNECTED for call:", callId);

      const instructions =
        process.env.AI_ASSISTANT_PROMPT ||
        "You are a helpful voice assistant.";

      console.log("⚙️ Sending session.update config to Realtime");

      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions,
            modalities: ["audio", "text"],
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            voice: "cedar",

            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              silence_duration_ms: 500,
            },

            input_audio_transcription: {
              model: "whisper-1",
            },

            tools: [
              {
                type: "function",
                name: "hangup_call",
                description: "Ends the call politely.",
                parameters: {}
              },
              {
                type: "function",
                name: "decline_call",
                description: "Declines the call immediately.",
                parameters: {}
              }
            ]
          },
        })
      );

      resolve(ws);
    });

    ws.on("error", (err) => {
      console.error("❌ OpenAI WS ERROR:", err);
      reject(err);
    });

    ws.on("close", () => {
      console.log("🔌 OpenAI WS CLOSED for call:", callId);
    });
  });
}
