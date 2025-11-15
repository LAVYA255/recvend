import WebSocket from "ws";

export function connectToOpenAI(callId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1"
        }
      }
    );

    ws.on("open", () => {
      console.log("🧠 OpenAI Realtime connected");

      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions: process.env.AI_ASSISTANT_PROMPT,
            modalities: ["audio", "text"],
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            voice: "cedar",
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              silence_duration_ms: 500,
            },
            input_audio_transcription: { model: "whisper-1" },
            tools: [
              { type: "function", name: "hangup_call", parameters: {} },
              { type: "function", name: "decline_call", parameters: {} }
            ]
          }
        })
      );

      resolve(ws);
    });

    ws.on("error", reject);
  });
}
