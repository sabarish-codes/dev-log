import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { loginApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { Terminal, ArrowRight, Loader2 } from 'lucide-react';

export function LandingPage() {
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const data = await loginApi({
        email: 'demo@devlog.io',
        password: 'Password123!',
      });
      setAuth(data.user, data.accessToken);
      toast.success(`Logged in as ${data.user.username}`);
      navigate('/logs');
    } catch {
      toast.error('Demo account unavailable. Try signing up.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Navbar */}
      <header className="flex h-16 items-center justify-between border-b px-6 md:px-12">
        <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <Terminal className="size-5 text-primary" />
          <span>dev-log</span>
        </div>
        <Link to="/login">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground mb-6">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          Personal Engineering Memory
        </div>

        <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Capture it once, <br />
          <span className="text-primary">find it when you need it.</span>
        </h1>

        <p className="mt-4 max-w-lg text-muted-foreground text-sm sm:text-base">
          Never waste hours debugging the same Docker, cookie, or language issue
          twice. Record in under a minute, retrieve in seconds.
        </p>

        {/* The 2 CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-none justify-center">
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2"
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
          >
            {isDemoLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Terminal className="size-4" />
            )}
            Try Demo
          </Button>

          <Link to="/login" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto gap-1"
            >
              Sign In / Sign Up
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
