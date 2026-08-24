const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { Notebook, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Markdown from "@/components/alpha/Markdown";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    db.entities.Note.list("-created_date", 200).then((n) => { setNotes(n); setLoading(false); });

  useEffect(() => { load(); }, []);

  const del = async (id) => {
    await db.entities.Note.delete(id);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <Notebook className="w-5 h-5" />
        <div className="font-semibold">My Notes</div>
      </header>
      <div className="max-w-3xl mx-auto p-4 space-y-3">
        {loading && <div className="text-muted-foreground">Loading…</div>}
        {!loading && notes.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            No notes yet. Alpha will offer to save important concepts during your conversations.
          </div>
        )}
        {notes.map((n) => (
          <div key={n.id} className="rounded-xl border p-4 bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold">{n.title}</div>
              <Button variant="ghost" size="icon" onClick={() => del(n.id)}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
            {n.concept && <div className="text-xs text-indigo-600 mb-2">{n.concept}</div>}
            <Markdown content={n.content} />
          </div>
        ))}
      </div>
    </div>
  );
}