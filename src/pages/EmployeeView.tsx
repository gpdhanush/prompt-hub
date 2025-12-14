import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { employeesApi } from "@/lib/api";
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle, MessageSquare, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfilePhotoUrl } from "@/lib/imageUtils";
import { Badge } from "@/components/ui/badge";

export default function EmployeeView() {
  const navigate = useNavigate();
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
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading employee details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive font-semibold mb-2">Error loading employee</p>
              <p className="text-muted-foreground mb-4">The employee you're looking for doesn't exist or has been deleted.</p>
              <Button onClick={() => navigate('/employees/list')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Employee Directory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/employees/list")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Employee Profile
            </h1>
            <p className="text-muted-foreground mt-1">View and manage employee information</p>
          </div>
        </div>
      </div>

      {/* Profile Header Card with Gradient */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl"></div>
              <Avatar className="h-32 w-32 relative border-4 border-background shadow-xl">
                <AvatarImage 
                  src={getProfilePhotoUrl(employee.profile_photo_url || employee.photo || null)} 
                />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                  {employee.name ? employee.name.split(" ").map((n: string) => n[0]).join("") : "E"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-3xl font-bold mb-1">{employee.name || "-"}</h2>
                <p className="text-muted-foreground text-lg">{employee.emp_code || `EMP-${employee.id}`}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {employee.role && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <Briefcase className="h-3.5 w-3.5" />
                    {employee.role}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Details Card */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="flex items-center gap-3 p-3.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <p className="text-sm font-semibold truncate">{employee.email || "-"}</p>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="flex items-center gap-3 p-3.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Mobile</p>
                      <p className="text-sm font-semibold truncate">{employee.mobile || "-"}</p>
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="flex items-center gap-3 p-3.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Gender</p>
                      <p className="text-sm font-semibold capitalize truncate">{employee.gender || "-"}</p>
                    </div>
                  </div>

                  {/* District */}
                  <div className="flex items-center gap-3 p-3.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">District</p>
                      <p className="text-sm font-semibold truncate">{employee.district || "-"}</p>
                    </div>
                  </div>

                  {/* Skype */}
                  <div className="flex items-center gap-3 p-3.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Skype</p>
                      <p className="text-sm font-semibold truncate">{employee.skype || "-"}</p>
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center gap-3 p-3.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">WhatsApp</p>
                      <p className="text-sm font-semibold truncate">{employee.whatsapp || "-"}</p>
                  </div>
                </div>
            </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
