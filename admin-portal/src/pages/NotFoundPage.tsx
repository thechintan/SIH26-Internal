import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { ShieldAlert, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shadow-glow-brand">
        <ShieldAlert className="w-8 h-8 text-rose-400" />
      </div>
      <h2 className="text-2xl font-black text-white">404 - Page Not Found</h2>
      <p className="text-xs text-slate-400 max-w-sm">
        The requested municipal view does not exist or your account may not have permission to access it.
      </p>
      <Button
        variant="primary"
        size="md"
        onClick={() => navigate('/')}
        leftIcon={<Home className="w-4 h-4" />}
      >
        Return to Dashboard
      </Button>
    </div>
  );
};
