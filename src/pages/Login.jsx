import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, WifiOff, ServerCrash } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/api/alphaClient";

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState("checking"); // "checking" | "online" | "offline"
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check if API server is reachable on mount
  useEffect(() => {
    let cancelled = false;
    const checkServer = async () => {
      try {
        // Try the health endpoint or a lightweight check
        const healthUrl = API_BASE ? `${API_BASE}/api/health` : '/api/health';
        const res = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
        if (!cancelled) {
          setServerStatus(res.ok ? "online" : "offline");
        }
      } catch {
        if (!cancelled) setServerStatus("offline");
      }
    };
    checkServer();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      const msg = err.message || "Invalid email or password";
      // Friendly error mapping
      if (msg.includes("HTML page") || msg.includes("does not exist")) {
        setError("Unable to connect to the server. Please try again in a moment.");
      } else if (msg.includes("Invalid email or password")) {
        setError("Incorrect email or password. Please check your credentials.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout icon={LogIn} title="Welcome back" subtitle="Log in to your account"
      footer={<>{`Don't have an account?`} <Link to="/register" className="text-primary font-medium hover:underline">Create one</Link></>}
    >
      {/* Server status indicator */}
      {serverStatus === "offline" && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
          <WifiOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">Server is not reachable</div>
            <div className="text-xs mt-1 opacity-80">The backend server may be starting up. You can try logging in — it may work once the server is ready.</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
          <ServerCrash className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="email" type="email" autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging in...</> : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
