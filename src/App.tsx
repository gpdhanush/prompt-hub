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
import FileManager from "./pages/FileManager";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import EmployeeProfile from "./pages/EmployeeProfile";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const queryClient = new QueryClient();

// Protected Route Component - checks user role before allowing access
function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: string[] 
}) {
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userRole = currentUser?.role || '';

  useEffect(() => {
    if (!allowedRoles.includes(userRole)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
    }
  }, [userRole, allowedRoles]);

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

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
              <Route 
                path="/users" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin', 'Team Lead']}>
                    <Users />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employees" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin', 'Team Lead']}>
                    <Employees />
                  </ProtectedRoute>
                } 
              />
              <Route path="/projects" element={<Projects />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/bugs" element={<Bugs />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leaves" element={<Leaves />} />
              <Route path="/reimbursements" element={<Reimbursements />} />
              <Route path="/prompts" element={<AIPrompts />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/files" element={<FileManager />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/employee-profile/:id" element={<EmployeeProfile />} />
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
