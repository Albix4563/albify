import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

// Interfaccia per i dati delle funzionalità
interface Feature {
  title: string;
  description: string;
  type: "new" | "improved" | "fixed";
}

// Interfaccia per i dati del changelog
interface ChangelogItem {
  version: string;
  date: string;
  features: Feature[];
}

// Dati del changelog
const changelogData: ChangelogItem[] = [
  {
    version: "0.1 BETA",
    date: "14 Maggio 2025",
    features: [
      {
        title: "Protezione per playlist Top Hits",
        description: "Implementata protezione completa per la playlist 'Top Hits' a livello di interfaccia e server, impedendo la modifica, l'eliminazione o la rimozione dei brani dalla playlist predefinita.",
        type: "improved"
      },
      {
        title: "Validazione di sicurezza",
        description: "Aggiunta validazione lato server per bloccare l'importazione di contenuti YouTube (sia video singoli che playlist) nella playlist protetta 'Top Hits'.",
        type: "improved"
      },
      {
        title: "Interfaccia di importazione migliorata",
        description: "Ottimizzata l'interfaccia di importazione YouTube per nascondere i campi nome e descrizione della playlist quando si importa contenuto in una playlist esistente.",
        type: "improved"
      },
      {
        title: "Aggiungi facilmente brani alle playlist",
        description: "Nuova interfaccia migliorata per aggiungere singoli brani alle tue playlist. Puoi aggiungere un brano a qualsiasi playlist esistente con pochi click attraverso un'interfaccia intuitiva e moderna.",
        type: "new"
      },
      {
        title: "Importazione da YouTube",
        description: "Nuova funzionalità per importare intere playlist da YouTube. Aggiungi facilmente playlist esistenti al tuo profilo inserendo l'URL della playlist YouTube.",
        type: "new"
      },
      {
        title: "Playlist predefinita",
        description: "Tutti gli utenti ricevono automaticamente una playlist 'Top Hits' con brani popolari già inseriti al momento della registrazione o del primo accesso.",
        type: "new"
      },
      {
        title: "Rotazione chiavi API YouTube",
        description: "Sistema migliorato per gestire fino a 4 chiavi API YouTube con rotazione automatica quando viene raggiunto il limite di quota, garantendo continuità del servizio.",
        type: "improved"
      },
      {
        title: "Layout responsive",
        description: "Layout mobile con sidebar spostata in basso (solo icone) e player posizionato sopra, che si adatta automaticamente alle dimensioni dello schermo come l'interfaccia mobile di Spotify.",
        type: "new"
      },
      {
        title: "Player collassabile",
        description: "Il music player appare solo quando la musica è in riproduzione e scompare quando non c'è musica attiva, funzionando perfettamente sia su mobile che desktop.",
        type: "new"
      },
      {
        title: "Branding migliorato",
        description: "Logo personalizzato ingrandito nella sidebar e titolo del browser aggiornato a 'Albify'.",
        type: "improved"
      },
      {
        title: "Traduzione completa",
        description: "Interfaccia completamente tradotta in italiano, inclusi elementi della sidebar, schermate di autenticazione, funzionalità di ricerca, sezioni playlist, pagina preferiti, elenchi tracce e messaggi di notifica.",
        type: "new"
      },
      {
        title: "Sicurezza migliorata",
        description: "Problemi di sicurezza nel processo di login risolti con l'aggiunta della verifica della password e account utente specifici per il testing.",
        type: "fixed"
      }
    ]
  }
];

// Badge colori in base al tipo
const getBadgeVariant = (type: Feature["type"]) => {
  switch (type) {
    case "new":
      return "bg-green-500/15 text-green-500 hover:bg-green-500/20";
    case "improved":
      return "bg-blue-500/15 text-blue-500 hover:bg-blue-500/20";
    case "fixed":
      return "bg-amber-500/15 text-amber-500 hover:bg-amber-500/20";
    default:
      return "bg-gray-500/15 text-gray-500 hover:bg-gray-500/20";
  }
};

// Badge etichetta in base al tipo
const getBadgeLabel = (type: Feature["type"]) => {
  switch (type) {
    case "new":
      return "Novità";
    case "improved":
      return "Migliorato";
    case "fixed":
      return "Risolto";
    default:
      return "Altro";
  }
};

export default function Changelog() {
  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-50">Changelog</h1>
        <Badge 
          variant="outline" 
          className="bg-blue-900/30 border-blue-500/50 text-blue-300 py-1 px-3 text-xs"
        >
          Versione Attuale: 0.1 BETA
        </Badge>
      </div>
      
      <p className="text-blue-300/80 mb-8">
        Questa pagina contiene informazioni sugli aggiornamenti e le nuove funzionalità 
        di Albify. Qui puoi trovare tutte le modifiche apportate all'applicazione nel 
        corso del tempo.
      </p>
      
      <div className="space-y-6">
        {changelogData.map((item) => (
          <Card key={item.version} className="bg-blue-950 border-blue-800/50 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-blue-200 text-xl flex items-center gap-3">
                  Versione {item.version}
                  <Badge className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/25 font-normal">
                    {item.date}
                  </Badge>
                </CardTitle>
              </div>
              <CardDescription className="text-blue-400/80">
                Lista delle modifiche in questa versione:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible defaultValue="changelog-0">
                {item.features.map((feature, idx) => (
                  <AccordionItem 
                    key={idx} 
                    value={`changelog-${idx}`}
                    className="border-blue-800/30"
                  >
                    <AccordionTrigger className="text-blue-100 hover:text-blue-200 hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        <Badge className={getBadgeVariant(feature.type)}>
                          {getBadgeLabel(feature.type)}
                        </Badge>
                        <span>{feature.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-blue-300/90 pl-2">
                      {feature.description}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Separator className="my-8 bg-blue-800/30" />
      
      <div className="text-center text-blue-400/60 text-sm">
        <p>Albify © 2025 - Tutti i diritti riservati</p>
        <p className="mt-1">Sviluppato con passione per la musica 🎵</p>
      </div>
    </div>
  );
}