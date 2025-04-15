import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth/AuthProvider";

import Home from "@/pages/Home";
import Calculator from "@/pages/Calculator";
import AdminDashboard from "@/pages/AdminDashboard";
import SimpleDashboard from "@/pages/SimpleDashboard";
import DashboardRouter from "@/pages/DashboardRouter";
import QuoteDetailsPage from "@/pages/QuoteDetailsPage";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import UserProfile from "@/pages/UserProfile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard-router" component={DashboardRouter} /> {/* Smart router */}
      <Route path="/dashboard" component={SimpleDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/calculator" component={Calculator} />
      <Route path="/admin" component={AdminDashboard} /> {/* Keep for backward compatibility */}
      <Route path="/login" component={Login} />
      <Route path="/quotes/:id" component={QuoteDetailsPage} />
      <Route path="/profile" component={UserProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
