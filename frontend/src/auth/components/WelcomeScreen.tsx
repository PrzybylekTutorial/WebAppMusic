import React from 'react';
import { LOGIN_URL } from '@/config';
import { Headphones, Lock, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface WelcomeScreenProps {
  authLoading: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ authLoading }) => {
  return (
    <div className="text-center mb-8">
      {authLoading ? (
        <div className="text-[var(--color-text-secondary)] text-lg flex items-center justify-center gap-2.5">
          <Loader className="animate-spin" size={24} /> Connecting to Spotify...
        </div>
      ) : (
        <div>
          <a href={LOGIN_URL} className="no-underline">
            <Button className="text-xl px-10 py-6 h-auto" variant="default">
              <Headphones size={24} className="mr-2" /> Connect with Spotify
            </Button>
          </a>
          
          <div className="mt-5 text-[0.95rem] text-[var(--color-text-secondary)] max-w-[450px] mx-auto">
             ✨ <strong>One-time setup:</strong> Connect once and stay logged in!
          </div>
          
          <Card className="mt-8 bg-[var(--color-accent-lime)] border-none shadow-[var(--shadow-soft)] max-w-[550px] mx-auto">
            <CardContent className="p-6 text-left text-[var(--color-text-primary)]">
              <div className="font-bold mb-3 flex items-center gap-2 text-lg">
                <Lock size={18} /> Secure Authentication
              </div>
              <ul className="m-0 pl-5 text-[0.9rem] leading-relaxed list-disc">
                <li>This app uses Spotify's secure login system.</li>
                <li>Your password is <strong>never</strong> shared with us.</li>
                <li>We only access your public profile and playback control.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;
