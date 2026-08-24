// Browser-based voice — no API keys exposed. Server-side TTS/STT can be wired later.

export function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const clean = String(text).replace(/[*#`_>]/g, " ");
  const u = new SpeechSynthesisUtterance(clean);
  u.rate = 1;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function getRecognition(onResult, onEnd) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.continuous = false;
  r.interimResults = false;
  r.lang = "en-US";
  r.onresult = (e) => onResult(e.results[0][0].transcript);
  r.onend = onEnd;
  r.onerror = onEnd;
  return r;
}