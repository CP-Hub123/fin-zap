import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaywallModal = ({ open, onOpenChange }: PaywallModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <div className="flex justify-center mb-2 mx-auto">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <DialogTitle className="text-xl text-center">Seu acesso expirou</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground text-center">
          Para continuar organizando suas finanças, ative seu acesso e tenha controle total do seu dinheiro.
        </p>
        <DialogFooter className="sm:flex-col">
          <Button className="w-full" onClick={() => { onOpenChange(false); navigate('/upgrade'); }}>
            Ativar acesso
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Continuar visualizando
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
