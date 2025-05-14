import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import Favorites from "@/pages/Favorites";
import Playlists from "@/pages/Playlists";
import PlaylistDetail from "@/pages/PlaylistDetail";
import Changelog from "@/pages/Changelog";
import { AuthProvider } from "@/hooks/use-auth";
import { PlayerProvider } from "@/hooks/use-player";

function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <TooltipProvider>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/search" component={Search} />
              <Route path="/favorites" component={Favorites} />
              <Route path="/playlists" component={Playlists} />
              <Route path="/playlists/:id" component={PlaylistDetail} />
              <Route path="/changelog" component={Changelog} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
          <Toaster />
        </TooltipProvider>
      </PlayerProvider>
    </AuthProvider>
  );
}

export default App;
