import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/app/Logo';

const Tutorials = () => {
  const navigate = useNavigate();
  const { data: tutorials = [] } = useQuery({
    queryKey: ['tutorials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <DollarSign className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Tutoriais</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {tutorials.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum tutorial disponível no momento.
          </div>
        ) : (
          tutorials.map(t => (
            <Card key={t.id} className="border-0 shadow-sm overflow-hidden">
              <div className="aspect-video">
                <iframe
                  src={getEmbedUrl(t.video_url)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{t.title}</CardTitle>
              </CardHeader>
              {t.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default Tutorials;
