import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/app/Logo';
import { ThemeToggle } from '@/components/app/ThemeToggle';
import { CreditCardsView } from '@/components/app/CreditCardsView';

const CreditCardsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="border-b border-border/60 bg-card/85 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')} aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Logo />
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <CreditCardsView />
      </main>
    </div>
  );
};

export default CreditCardsPage;