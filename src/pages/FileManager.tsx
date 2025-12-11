import { useState } from "react";
import {
  FolderOpen,
  Upload,
  Search,
  Download,
  Trash2,
  File,
  Image,
  FileText,
  MoreHorizontal,
  Eye,
  Calendar,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

const sampleFiles = [
  {
    id: 1,
    name: "project-spec.pdf",
    type: "application/pdf",
    size: 2456789,
    uploadedBy: "Ravi Kumar",
    uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    taskId: 1,
    bugId: null,
    reimbursementId: null,
    path: "/uploads/tasks/project-spec.pdf",
  },
  {
    id: 2,
    name: "screenshot-bug.png",
    type: "image/png",
    size: 1234567,
    uploadedBy: "Priya Sharma",
    uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    taskId: null,
    bugId: 1,
    reimbursementId: null,
    path: "/uploads/bugs/screenshot-bug.png",
  },
  {
    id: 3,
    name: "receipt-travel.pdf",
    type: "application/pdf",
    size: 456789,
    uploadedBy: "Amit Patel",
    uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    taskId: null,
    bugId: null,
    reimbursementId: 1,
    path: "/uploads/reimbursements/receipt-travel.pdf",
  },
  {
    id: 4,
    name: "api-documentation.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 3456789,
    uploadedBy: "Sarah Chen",
    uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    taskId: 2,
    bugId: null,
    reimbursementId: null,
    path: "/uploads/tasks/api-documentation.docx",
  },
  {
    id: 5,
    name: "error-log.txt",
    type: "text/plain",
    size: 12345,
    uploadedBy: "John Smith",
    uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    taskId: null,
    bugId: 2,
    reimbursementId: null,
    path: "/uploads/bugs/error-log.txt",
  },
];

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("pdf")) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

export default function FileManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<typeof sampleFiles[0] | null>(null);

  const filteredFiles = sampleFiles.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || 
      (filterType === "task" && file.taskId) ||
      (filterType === "bug" && file.bugId) ||
      (filterType === "reimbursement" && file.reimbursementId);
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-primary" />
            File Manager
          </h1>
          <p className="text-muted-foreground">Manage and organize all uploaded files</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop files here, or click to browse
                </p>
                <Button variant="outline" size="sm">Select Files</Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Max file size: 10MB. Supported: PDF, Images, Documents
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{sampleFiles.length}</div>
            <p className="text-xs text-muted-foreground">Total Files</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatFileSize(sampleFiles.reduce((acc, f) => acc + f.size, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Total Size</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {sampleFiles.filter(f => f.taskId).length}
            </div>
            <p className="text-xs text-muted-foreground">Task Files</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {sampleFiles.filter(f => f.bugId).length}
            </div>
            <p className="text-xs text-muted-foreground">Bug Attachments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Files</SelectItem>
            <SelectItem value="task">Task Files</SelectItem>
            <SelectItem value="bug">Bug Attachments</SelectItem>
            <SelectItem value="reimbursement">Reimbursement Receipts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Files Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>All uploaded files and attachments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Related To</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.type);
                const relatedTo = file.taskId 
                  ? `Task #${file.taskId.toString().padStart(5, '0')}`
                  : file.bugId 
                  ? `Bug #${file.bugId}`
                  : file.reimbursementId
                  ? `Reimbursement #${file.reimbursementId}`
                  : "N/A";

                return (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.type}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant="neutral">
                        {file.type.split("/")[0]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {file.uploadedBy}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant="info">{relatedTo}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDistanceToNow(file.uploadedAt, { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedFile(file)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* File Details Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                {(() => {
                  const FileIcon = getFileIcon(selectedFile.type);
                  return (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  );
                })()}
                <div>
                  <p className="font-semibold">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedFile.type}</p>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Size:</span>
                  <span className="text-sm font-medium">{formatFileSize(selectedFile.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Uploaded By:</span>
                  <span className="text-sm font-medium">{selectedFile.uploadedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Uploaded:</span>
                  <span className="text-sm font-medium">
                    {formatDistanceToNow(selectedFile.uploadedAt, { addSuffix: true })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Path:</span>
                  <span className="text-sm font-mono text-muted-foreground">{selectedFile.path}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="destructive" className="flex-1">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

