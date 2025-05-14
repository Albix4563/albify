import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Playlist form schema
const playlistSchema = z.object({
  name: z.string().min(1, { message: "Il nome della playlist non può essere vuoto" }).max(100),
  description: z.string().max(500).optional(),
});

type PlaylistFormValues = z.infer<typeof playlistSchema>;

export default function CreatePlaylistModal({ isOpen, onClose }: CreatePlaylistModalProps) {
  const { toast } = useToast();
  
  // Playlist form
  const form = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Create playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async (data: PlaylistFormValues) => {
      const res = await apiRequest("POST", "/api/playlists", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.playlists] });
      form.reset();
      onClose();
      
      toast({
        title: "Playlist creata",
        description: "La tua nuova playlist è stata creata con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Impossibile creare la playlist",
        description: error.message || "Si è verificato un errore durante la creazione della playlist",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PlaylistFormValues) => {
    createPlaylistMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[hsl(var(--albify-card))] border-[hsl(var(--albify-divider))] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Crea Playlist</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Playlist</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="La Mia Playlist"
                      className="bg-gray-800 border-gray-700 text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrivi la tua playlist..."
                      className="bg-gray-800 border-gray-700 text-white resize-none h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-4 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="w-1/2 border-gray-700 text-white"
              >
                Annulla
              </Button>
              <Button 
                type="submit" 
                className="w-1/2 bg-[hsl(var(--albify-accent))] hover:bg-opacity-80"
                disabled={createPlaylistMutation.isPending}
              >
                {createPlaylistMutation.isPending ? "Creazione..." : "Crea"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
