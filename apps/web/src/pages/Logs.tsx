import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { logoutApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { LogOut, Terminal, User as UserIcon } from 'lucide-react';

export function LogsPage() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Proceed with local cleanup even if network fails
    } finally {
      clearAuth();
      toast.success('Logged out successfully');
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Dashboard Header */}
      <header className="flex h-16 items-center justify-between border-b px-6 md:px-12">
        <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <Terminal className="size-5 text-primary" />
          <span>dev-log</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserIcon className="size-4" />
            <span>{user?.username || 'Developer'}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Logs Dashboard</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Log CRUD, search, and filters coming in Slice 2.
        </p>
      </main>
    </div>
  );
}
