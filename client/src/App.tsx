import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/hooks/use-theme";

import Home from "@/pages/Home";
import Calculator from "@/pages/Calculator";
import Dashboard from "@/pages/Dashboard";
import QuoteDetailsPage from "@/pages/QuoteDetailsPage";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Settings from "@/pages/Settings";
import AllQuotes from "@/pages/AllQuotes";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/calculator" component={Calculator} />
      
      {/* Redirect old routes to new dashboard */}
      <Route path="/dashboard-router">
        {() => { window.location.href = "/dashboard"; return null; }}
      </Route>
      <Route path="/admin-dashboard">
        {() => { window.location.href = "/dashboard"; return null; }}
      </Route>
      <Route path="/admin">
        {() => { window.location.href = "/dashboard"; return null; }}
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/quotes" component={AllQuotes} />
      <Route path="/quotes/:id" component={QuoteDetailsPage} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
