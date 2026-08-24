import React, { useState, useRef } from "react";
import { Send, Mic, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getRecognition } from "@/lib/voice";

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ChatInput({ onSend, thinking }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState([]);
  const [listening, setListening] = useState(false);
  const fileRef = useRef(null);

  const submit = () => {
    if (thinking) return;
    if (!text.trim() && pending.length === 0) return;
    // Send file data URLs as attachments (Groq supports base64 images)
    onSend(text.trim(), pending.map((p) => p.url));
    setText("");
    setPending([]);
  };

  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      try {
        const dataUrl = await fileToDataURL(f);
        setPending((p) => [...p, { url: dataUrl, name: f.name }]);
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    }
    e.target.value = "";
  };

  const toggleMic = () => {
    const rec = getRecognition(
      (t) => { setText(t); setListening(false); },
      () => setListening(false)
    );
    if (!rec) { alert("Voice input isn't supported on this browser."); return; }
    setListening(true);
    rec.start();
  };

  return (
    <div className="border-t bg-background p-3">
      <div className="max-w-3xl mx-auto">
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pending.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-muted rounded-full pl-2 pr-1 py-1">
                <Paperclip className="w-3 h-3" />
                <span className="max-w-[140px] truncate">{p.name}</span>
                <button onClick={() => setPending((arr) => arr.filter((_, j) => j !== i))}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 focus-within:ring-2 focus-within:ring-indigo-200 transition">
          <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} title="Attach image or document">
            <Paperclip className="w-4 h-4" />
          </Button>
          <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,.txt,.docx" className="hidden" onChange={onFile} />
          <Button variant="ghost" size="icon" onClick={toggleMic} className={listening ? "text-red-500" : ""} title="Speak to Alpha">
            <Mic className="w-4 h-4" />
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Talk to Alpha…"
            rows={1}
            className="resize-none border-0 bg-transparent focus-visible:ring-0 max-h-40 min-h-[40px]"
          />
          <Button size="icon" onClick={submit} disabled={thinking || (!text.trim() && pending.length === 0)}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-[10px] text-muted-foreground text-center mt-1">
          Alpha can teach, quiz, run exams, repair mistakes & more — just ask.
        </div>
      </div>
    </div>
  );
}
