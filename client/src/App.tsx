import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Documents from "@/pages/Documents";
import History from "@/pages/History";
import NotFound from "@/pages/NotFound";
import Practice from "@/pages/Practice";
import Profile from "@/pages/Profile";
import StarBank from "@/pages/StarBank";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/profile" component={Profile} />
    <Route path="/documents" component={Documents} />
    <Route path="/stars" component={StarBank} />
    <Route path="/practice" component={Practice} />
    <Route path="/history" component={History} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
