'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: (projectId: string) => void;
}

export function CreateProjectDialog({ 
  isOpen,
  onOpenChange,
  organizationId,
  onSuccess
}: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du projet est requis',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description.trim() || null,
          organizationId,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("CreateProjectDialog: API response:", result);
        const project = result.data; // Extract project from data property
        
        toast({
          title: 'Succès',
          description: 'Projet créé avec succès',
        });
        
        // Reset form
        setName('');
        setDescription('');
        
        // Close dialog
        onOpenChange(false);
        
        // Call success callback or redirect
        console.log("CreateProjectDialog: About to redirect/callback with projectId:", project.id);
        if (onSuccess) {
          onSuccess(project.id);
        } else {
          router.push(`/projects/${project.id}`);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Échec de la création du projet');
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la création du projet',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Créer un projet</DialogTitle>
            <DialogDescription>
              Créer un nouveau projet dans votre organisation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon Projet"
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brève description de votre projet"
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 