import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, Trash2, Download, Eye, EyeOff, Clock, Calendar, Key, MessageSquare, FileText, AlertCircle, CheckCircle2, X, Save, Image as ImageIcon, File, FileType, Presentation, FileSpreadsheet, Video, Music, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { DatePicker } from "@/components/ui/date-picker";
import { projectsApi } from "@/features/projects/api";
import { toast } from "@/hooks/use-toast";
// Date formatting utilities
const formatDate = (dateString?: string) => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", { 
    year: "numeric",
    month: "short", 
    day: "numeric"
  });
};

const formatFullDate = (dateString?: string) => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", { 
    year: "numeric",
    month: "long", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

// Get file icon based on file extension
const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(extension)) {
    return ImageIcon;
  }
  
  // PDF files
  if (extension === 'pdf') {
    return FileType;
  }
  
  // Document files
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
    return FileText;
  }
  
  // Spreadsheet files
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
    return FileSpreadsheet;
  }
  
  // Presentation files
  if (['ppt', 'pptx', 'odp'].includes(extension)) {
    return Presentation;
  }
  
  // Video files
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
    return Video;
  }
  
  // Audio files
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(extension)) {
    return Music;
  }
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
    return Archive;
  }
  
  // Default file icon
  return File;
};

// Component for file item with image fallback
function FileItemWithImage({ file, isImage, FileIcon, projectId, canEdit, queryClient }: { 
  file: any; 
  isImage: boolean; 
  FileIcon: any;
  projectId: number;
  canEdit: boolean;
  queryClient: any;
}) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <div className="flex items-center justify-between p-3 border rounded">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isImage && file.file_url && !imageError ? (
          <div className="h-12 w-12 rounded border overflow-hidden flex-shrink-0 bg-muted">
            <img 
              src={file.file_url} 
              alt={file.file_name}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-12 w-12 rounded border flex-shrink-0 bg-muted">
            <FileIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{file.file_name}</div>
          <div className="text-sm text-muted-foreground">
            {file.file_type} {file.file_category && `• ${file.file_category}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a href={file.file_url} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </a>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              if (confirm("Are you sure you want to delete this file?")) {
                try {
                  await projectsApi.deleteFile(projectId, file.id);
                  queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
                  toast({ title: "Success", description: "File deleted successfully." });
                } catch (error: any) {
                  toast({ title: "Error", description: error.message, variant: "destructive" });
                }
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface ProjectTabsProps {
  projectId: number;
  project: any;
  canEdit: boolean;
}

export function ProjectTabs({ projectId, project, canEdit }: ProjectTabsProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all data
  const { data: filesData } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: () => projectsApi.getFiles(projectId),
  });

  const { data: changeRequestsData } = useQuery({
    queryKey: ['project-change-requests', projectId],
    queryFn: () => projectsApi.getChangeRequests(projectId),
  });

  const { data: callNotesData } = useQuery({
    queryKey: ['project-call-notes', projectId],
    queryFn: () => projectsApi.getCallNotes(projectId),
  });

  const { data: dailyStatusData } = useQuery({
    queryKey: ['project-daily-status', projectId],
    queryFn: () => projectsApi.getDailyStatus(projectId),
  });

  const { data: commentsData } = useQuery({
    queryKey: ['project-comments', projectId],
    queryFn: () => projectsApi.getComments(projectId),
  });

  const { data: workedTimeData } = useQuery({
    queryKey: ['project-worked-time', projectId],
    queryFn: () => projectsApi.getTotalWorkedTime(projectId),
  });

  const files = filesData?.data || [];
  const changeRequests = changeRequestsData?.data || [];
  const callNotes = callNotesData?.data || [];
  const dailyStatus = dailyStatusData?.data || [];
  const comments = commentsData?.data || [];
  const workedTime = workedTimeData?.data 
    ? {
        total_hours: typeof workedTimeData.data.total_hours === 'number' 
          ? workedTimeData.data.total_hours 
          : parseFloat(workedTimeData.data.total_hours) || 0,
        total_minutes: typeof workedTimeData.data.total_minutes === 'number'
          ? workedTimeData.data.total_minutes
          : parseInt(workedTimeData.data.total_minutes) || 0,
        unique_contributors: typeof workedTimeData.data.unique_contributors === 'number'
          ? workedTimeData.data.unique_contributors
          : parseInt(workedTimeData.data.unique_contributors) || 0,
      }
    : { total_hours: 0, total_minutes: 0, unique_contributors: 0 };

  // File upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("");
  const [fileCategory, setFileCategory] = useState("");
  const [fileDescription, setFileDescription] = useState("");

  const uploadFileMutation = useMutation({
    mutationFn: (formData: FormData) => projectsApi.uploadFile(projectId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      toast({ title: "Success", description: "File uploaded successfully." });
      setSelectedFile(null);
      setFileType("");
      setFileCategory("");
      setFileDescription("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to upload file.", variant: "destructive" });
    },
  });

  const handleFileUpload = () => {
    if (!selectedFile || !fileType) {
      toast({ title: "Validation Error", description: "Please select a file and file type.", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('file_type', fileType);
    if (fileCategory) formData.append('file_category', fileCategory);
    if (fileDescription) formData.append('description', fileDescription);

    uploadFileMutation.mutate(formData);
  };

  // Change Request form
  const [changeRequestForm, setChangeRequestForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    impact: "",
    estimated_effort_hours: "",
  });

  const createChangeRequestMutation = useMutation({
    mutationFn: (data: any) => projectsApi.createChangeRequest(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-change-requests', projectId] });
      toast({ title: "Success", description: "Change request created successfully." });
      setChangeRequestForm({ title: "", description: "", priority: "Medium", impact: "", estimated_effort_hours: "" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create change request.", variant: "destructive" });
    },
  });

  // Call Note form
  const [callNoteForm, setCallNoteForm] = useState({
    call_date: "",
    call_duration_minutes: "",
    participants: "",
    notes: "",
    action_items: "",
    follow_up_required: false,
    follow_up_date: "",
  });

  const createCallNoteMutation = useMutation({
    mutationFn: (data: any) => projectsApi.createCallNote(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-call-notes', projectId] });
      toast({ title: "Success", description: "Call note added successfully." });
      setCallNoteForm({ call_date: "", call_duration_minutes: "", participants: "", notes: "", action_items: "", follow_up_required: false, follow_up_date: "" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add call note.", variant: "destructive" });
    },
  });

  // Daily Status form
  const [dailyStatusForm, setDailyStatusForm] = useState({
    work_date: new Date().toISOString().split('T')[0],
    hours_worked: "",
    minutes_worked: "",
    work_description: "",
    tasks_completed: "",
    blockers: "",
  });

  const createDailyStatusMutation = useMutation({
    mutationFn: (data: any) => projectsApi.createDailyStatus(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-daily-status', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-worked-time', projectId] });
      toast({ title: "Success", description: "Daily status saved successfully." });
      setDailyStatusForm({ work_date: new Date().toISOString().split('T')[0], hours_worked: "", minutes_worked: "", work_description: "", tasks_completed: "", blockers: "" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save daily status.", variant: "destructive" });
    },
  });

  // Comment form
  const [commentForm, setCommentForm] = useState({
    comment: "",
    comment_type: "General",
    is_internal: true,
  });

  const createCommentMutation = useMutation({
    mutationFn: (data: any) => projectsApi.createComment(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-comments', projectId] });
      toast({ title: "Success", description: "Comment added successfully." });
      setCommentForm({ comment: "", comment_type: "General", is_internal: true });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add comment.", variant: "destructive" });
    },
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-6 bg-muted/50">
        <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
        <TabsTrigger value="files" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Files</TabsTrigger>
        <TabsTrigger value="change-requests" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Change Requests</TabsTrigger>
        <TabsTrigger value="calls" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Client Calls</TabsTrigger>
        <TabsTrigger value="status" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Daily Status</TabsTrigger>
        <TabsTrigger value="comments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Comments</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 mt-6">
        {/* Technologies */}
        {project.technologies_used && Array.isArray(project.technologies_used) && project.technologies_used.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Technologies Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {project.technologies_used.map((tech: string) => (
                  <span key={tech} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    {tech}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Worked Time */}
        {(workedTime.total_hours > 0 || workedTime.total_minutes > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Total Worked Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Total Hours</Label>
                  <div className="text-2xl font-bold">
                    {typeof workedTime.total_hours === 'number' 
                      ? workedTime.total_hours.toFixed(2) 
                      : (parseFloat(String(workedTime.total_hours)) || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Total Minutes</Label>
                  <div className="text-2xl font-bold">
                    {typeof workedTime.total_minutes === 'number'
                      ? workedTime.total_minutes
                      : parseInt(String(workedTime.total_minutes)) || 0}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Contributors</Label>
                  <div className="text-2xl font-bold">
                    {typeof workedTime.unique_contributors === 'number'
                      ? workedTime.unique_contributors
                      : parseInt(String(workedTime.unique_contributors)) || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="files" className="space-y-6 mt-6">
        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>File</Label>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>File Type</Label>
                  <Select value={fileType} onValueChange={setFileType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOW">SOW</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Design Document">Design Document</SelectItem>
                      <SelectItem value="Requirement Doc">Requirement Doc</SelectItem>
                      <SelectItem value="Change Request">Change Request</SelectItem>
                      <SelectItem value="Meeting Notes">Meeting Notes</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Category (Optional)</Label>
                  <Input
                    value={fileCategory}
                    onChange={(e) => setFileCategory(e.target.value)}
                    placeholder="e.g., Documentation"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <Button onClick={handleFileUpload} disabled={uploadFileMutation.isPending}>
                <Upload className="mr-2 h-4 w-4" />
                {uploadFileMutation.isPending ? "Uploading..." : "Upload File"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Project Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {files.map((file: any) => {
                  const FileIcon = getFileIcon(file.file_name);
                  const extension = file.file_name.split('.').pop()?.toLowerCase() || '';
                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(extension);
                  
                  return (
                    <FileItemWithImage 
                      key={file.id} 
                      file={file} 
                      isImage={isImage} 
                      FileIcon={FileIcon}
                      projectId={projectId}
                      canEdit={canEdit}
                      queryClient={queryClient}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="change-requests" className="space-y-6 mt-6">
        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>Create Change Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Title *</Label>
                <Input
                  value={changeRequestForm.title}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, title: e.target.value })}
                  placeholder="Enter change request title"
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={changeRequestForm.description}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select
                    value={changeRequestForm.priority}
                    onValueChange={(value) => setChangeRequestForm({ ...changeRequestForm, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Estimated Effort (Hours)</Label>
                  <Input
                    type="number"
                    value={changeRequestForm.estimated_effort_hours}
                    onChange={(e) => setChangeRequestForm({ ...changeRequestForm, estimated_effort_hours: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Impact</Label>
                <Textarea
                  value={changeRequestForm.impact}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, impact: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={() => createChangeRequestMutation.mutate(changeRequestForm)} disabled={createChangeRequestMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {createChangeRequestMutation.isPending ? "Creating..." : "Create Change Request"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Change Requests ({changeRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {changeRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No change requests</p>
            ) : (
              <div className="space-y-4">
                {changeRequests.map((cr: any) => (
                  <Card key={cr.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{cr.title}</h4>
                          <p className="text-sm text-muted-foreground">Requested by {cr.requested_by_name}</p>
                        </div>
                        <StatusBadge variant={cr.status === 'Approved' ? 'success' : cr.status === 'Rejected' ? 'error' : 'warning'}>
                          {cr.status}
                        </StatusBadge>
                      </div>
                      {cr.description && <p className="text-sm mb-2">{cr.description}</p>}
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Priority: {cr.priority}</span>
                        {cr.estimated_effort_hours && <span>Effort: {cr.estimated_effort_hours}h</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="calls" className="space-y-6 mt-6">
        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>Add Client Call Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Call Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={callNoteForm.call_date}
                    onChange={(e) => setCallNoteForm({ ...callNoteForm, call_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Duration (Minutes)</Label>
                  <Input
                    type="number"
                    value={callNoteForm.call_duration_minutes}
                    onChange={(e) => setCallNoteForm({ ...callNoteForm, call_duration_minutes: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Participants</Label>
                <Input
                  value={callNoteForm.participants}
                  onChange={(e) => setCallNoteForm({ ...callNoteForm, participants: e.target.value })}
                  placeholder="Comma-separated list of participants"
                />
              </div>
              <div className="grid gap-2">
                <Label>Notes *</Label>
                <Textarea
                  value={callNoteForm.notes}
                  onChange={(e) => setCallNoteForm({ ...callNoteForm, notes: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label>Action Items</Label>
                <Textarea
                  value={callNoteForm.action_items}
                  onChange={(e) => setCallNoteForm({ ...callNoteForm, action_items: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={() => createCallNoteMutation.mutate(callNoteForm)} disabled={createCallNoteMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {createCallNoteMutation.isPending ? "Adding..." : "Add Call Note"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Client Call Notes ({callNotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {callNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No call notes recorded</p>
            ) : (
              <div className="space-y-4">
                {callNotes.map((note: any) => (
                  <Card key={note.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="font-semibold">{formatFullDate(note.call_date)}</div>
                          {note.call_duration_minutes && (
                            <div className="text-sm text-muted-foreground">Duration: {note.call_duration_minutes} minutes</div>
                          )}
                        </div>
                      </div>
                      {note.participants && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">Participants: </span>
                          {note.participants}
                        </div>
                      )}
                      <p className="text-sm mb-2">{note.notes}</p>
                      {note.action_items && (
                        <div className="text-sm">
                          <span className="font-medium">Action Items: </span>
                          {note.action_items}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="status" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Enter Daily Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Work Date</Label>
                <DatePicker
                  value={dailyStatusForm.work_date}
                  onChange={(date) => setDailyStatusForm({ ...dailyStatusForm, work_date: date })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Hours</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={dailyStatusForm.hours_worked}
                  onChange={(e) => setDailyStatusForm({ ...dailyStatusForm, hours_worked: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={dailyStatusForm.minutes_worked}
                  onChange={(e) => setDailyStatusForm({ ...dailyStatusForm, minutes_worked: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Work Description</Label>
              <Textarea
                value={dailyStatusForm.work_description}
                onChange={(e) => setDailyStatusForm({ ...dailyStatusForm, work_description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tasks Completed</Label>
              <Textarea
                value={dailyStatusForm.tasks_completed}
                onChange={(e) => setDailyStatusForm({ ...dailyStatusForm, tasks_completed: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>Blockers</Label>
              <Textarea
                value={dailyStatusForm.blockers}
                onChange={(e) => setDailyStatusForm({ ...dailyStatusForm, blockers: e.target.value })}
                rows={2}
              />
            </div>
            <Button onClick={() => createDailyStatusMutation.mutate(dailyStatusForm)} disabled={createDailyStatusMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {createDailyStatusMutation.isPending ? "Saving..." : "Save Daily Status"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Status Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status entries yet</p>
            ) : (
              <div className="space-y-2">
                {dailyStatus.map((entry: any) => (
                  <div key={entry.id} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{entry.user_name}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(entry.work_date)}</div>
                      </div>
                      <div className="text-sm font-medium">
                        {entry.hours_worked}h {entry.minutes_worked}m
                      </div>
                    </div>
                    {entry.work_description && <p className="text-sm">{entry.work_description}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="comments" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Comment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Comment Type</Label>
              <Select
                value={commentForm.comment_type}
                onValueChange={(value) => setCommentForm({ ...commentForm, comment_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Developer">Developer</SelectItem>
                  <SelectItem value="Tester">Tester</SelectItem>
                  <SelectItem value="Designer">Designer</SelectItem>
                  <SelectItem value="Team Lead">Team Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Comment</Label>
              <Textarea
                value={commentForm.comment}
                onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
                rows={4}
              />
            </div>
            <Button onClick={() => createCommentMutation.mutate(commentForm)} disabled={createCommentMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {createCommentMutation.isPending ? "Adding..." : "Add Comment"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comments ({comments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="p-3 border rounded">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{comment.user_name}</div>
                        <div className="text-sm text-muted-foreground">{formatFullDate(comment.created_at)}</div>
                      </div>
                      <StatusBadge variant="neutral">{comment.comment_type}</StatusBadge>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
