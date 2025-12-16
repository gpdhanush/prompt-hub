import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { employeesApi } from "@/features/employees/api";
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle, MessageSquare, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfilePhotoUrl } from "@/lib/imageUtils";
import { Separator } from "@/components/ui/separator";

export default function EmployeeView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // Fetch employee data from API (using basic endpoint that doesn't require permission)
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-basic', id],
    queryFn: () => employeesApi.getBasicById(Number(id)),
    enabled: !!id,
  });

  const employee = data?.data;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <p className="text-muted-foreground text-sm">Loading employee details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-semibold text-destructive mb-2">Employee Not Found</p>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  The employee you're looking for doesn't exist or has been deleted.
                </p>
              </div>
              <Button onClick={() => navigate('/employees/list')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Employee Directory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contactItems = [
    {
      icon: Mail,
      label: "Email",
      value: employee.email || "-",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      icon: Phone,
      label: "Mobile",
      value: employee.mobile || "-",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      icon: User,
      label: "Gender",
      value: employee.gender || "-",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      icon: MapPin,
      label: "District",
      value: employee.district || "-",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      icon: MessageCircle,
      label: "Teams ID",
      value: employee.teams_id || employee.skype || "-",
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-50 dark:bg-cyan-950",
    },
    {
      icon: MessageSquare,
      label: "WhatsApp",
      value: employee.whatsapp || "-",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              // Check if user came from Employees page or Employee Directory
              const fromEmployees = location.state?.from === '/employees' || 
                                    document.referrer.includes('/employees') && !document.referrer.includes('/employees/list');
              navigate(fromEmployees ? '/employees' : '/employees/list');
            }}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Employee Profile
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              View employee information
            </p>
          </div>
        </div>
      </div>

      {/* Profile Header Card with Enhanced Gradient */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50"></div>
        <CardContent className="pt-6 pb-6 sm:pt-8 sm:pb-8 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar Section */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-2 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 relative border-4 border-background shadow-2xl ring-4 ring-primary/10">
                <AvatarImage 
                  src={getProfilePhotoUrl(employee.profile_photo_url || employee.photo || null)} 
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl sm:text-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold">
                  {employee.name ? employee.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "E"}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-4 min-w-0">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">
                  {employee.name || "-"}
                </h2>
                <p className="text-muted-foreground text-base sm:text-lg font-mono">
                  {employee.emp_code || `EMP-${employee.id}`}
                </p>
              </div>
              
              {employee.role && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-semibold border border-primary/20 shadow-sm">
                    <Briefcase className="h-4 w-4" />
                    <span>{employee.role}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Details Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary"></div>
            Contact Information
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contactItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="group relative p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-11 w-11 rounded-xl ${item.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200 shadow-sm`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {item.label}
                      </p>
                      <p className="text-sm font-semibold text-foreground break-words">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
