import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

export function DemoEntryPage() {
  const { startDemo } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Opening the demo workspace…');

  useEffect(() => {
    let active = true;
    startDemo()
      .then(() => {
        if (active) navigate('/', { replace: true });
      })
      .catch((err: any) => {
        if (!active) return;
        setMessage(err.response?.data?.error?.message || 'The demo workspace could not be opened.');
      });
    return () => {
      active = false;
    };
  }, [navigate, startDemo]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl text-center space-y-3">
        <h1 className="text-lg font-bold text-foreground">Instant Demo</h1>
        <p className="text-xs text-muted-foreground">{message}</p>
        <Link to="/" className="inline-block text-xs font-semibold text-primary hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
