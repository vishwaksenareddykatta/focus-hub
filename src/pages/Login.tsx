import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LayoutDashboard } from "lucide-react";

const Login = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center glow">
            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight">D.O.P.E</span>
        </div>

        <div className="card-surface p-8">
          <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your dashboard</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-muted border-border focus:border-primary focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-muted border-border focus:border-primary focus:ring-primary"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-medium glow-sm hover:opacity-90 transition-opacity">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Dashboard for Operations, Productions and Engineering
        </p>
      </div>
    </div>
  );
};

export default Login;
