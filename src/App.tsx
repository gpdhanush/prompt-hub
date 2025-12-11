import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Employees from "./pages/Employees";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Bugs from "./pages/Bugs";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Reimbursements from "./pages/Reimbursements";
import AIPrompts from "./pages/AIPrompts";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/bugs" element={<Bugs />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leaves" element={<Leaves />} />
              <Route path="/reimbursements" element={<Reimbursements />} />
              <Route path="/prompts" element={<AIPrompts />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
