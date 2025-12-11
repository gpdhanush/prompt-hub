import { useState } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  Download,
  Sparkles,
  Tag,
  Clock,
  User,
  CheckCircle,
  Filter,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

const promptTemplates = [
  {
    id: 1,
    title: "Full System Architect + DB + API",
    description: "Complete enterprise-level system generation with Next.js and MySQL",
    category: "System Spec",
    body: "Create a complete enterprise-level Project and User Maintenance System using Next.js as a full-stack monorepo and MySQL as the database. I will only provide the MySQL connection string; generate everything else. Build the entire architecture, backend logic, database schema, API design, and frontend flow...",
    variables: ["PROJECT_NAME", "DB_CONNECTION"],
    uses: 24,
    lastUsed: "Today",
    createdBy: "Super Admin",
    isApproved: true,
    version: 3,
  },
  {
    id: 2,
    title: "Admin Panel Table + Badges",
    description: "Design internal admin panel tables with status badges",
    category: "UI Flow",
    body: "Design an internal Admin Panel table view for Projects, Users, Employees, Reimbursements, Leaves, Tasks, and Bugs. For each row include a colored badge status and an actions column (View/Edit/Delete/Approve)...",
    variables: ["TABLE_ENTITIES", "BADGE_COLORS"],
    uses: 18,
    lastUsed: "Yesterday",
    createdBy: "Admin",
    isApproved: true,
    version: 2,
  },
  {
    id: 3,
    title: "Task Workflow & Comments",
    description: "Full task lifecycle and threaded comments implementation",
    category: "API Skeleton",
    body: "Write the full task lifecycle and comment workflow: task creation (5-digit auto ID), assign to users, employees can open one task at a time, update progress, upload images/attachments, add progress notes...",
    variables: ["TASK_STATUSES", "COMMENT_DEPTH"],
    uses: 15,
    lastUsed: "2 days ago",
    createdBy: "Admin",
    isApproved: true,
    version: 1,
  },
  {
    id: 4,
    title: "DB Schema Generator",
    description: "Generate MySQL DDL scripts with seed data",
    category: "DB Schema",
    body: "Generate DB schema for {{PROJECT_NAME}} with users, roles, tasks, attachments, and audit logs. Use MySQL DDL and sample seed data. Assume DB connection: {{DB_CONNECTION}}.",
    variables: ["PROJECT_NAME", "DB_CONNECTION", "TABLES_LIST"],
    uses: 12,
    lastUsed: "3 days ago",
    createdBy: "Super Admin",
    isApproved: true,
    version: 4,
  },
  {
    id: 5,
    title: "Test Cases Template",
    description: "Generate test cases for API endpoints",
    category: "Test Cases",
    body: "Generate comprehensive test cases for {{ENDPOINT_NAME}} including unit tests, integration tests, and edge cases...",
    variables: ["ENDPOINT_NAME", "HTTP_METHOD", "EXPECTED_RESPONSES"],
    uses: 8,
    lastUsed: "1 week ago",
    createdBy: "Admin",
    isApproved: false,
    version: 1,
  },
];

const categories = ["All", "System Spec", "Project Setup", "API Skeleton", "DB Schema", "UI Flow", "Test Cases"];

export default function AIPrompts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedPrompt, setSelectedPrompt] = useState<typeof promptTemplates[0] | null>(null);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const filteredPrompts = promptTemplates.filter((prompt) => {
    const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || prompt.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopyPrompt = (prompt: typeof promptTemplates[0]) => {
    navigator.clipboard.writeText(prompt.body);
    toast({
      title: "Copied to clipboard",
      description: "Prompt template has been copied.",
    });
  };

  const handleExport = (prompt: typeof promptTemplates[0], format: "txt" | "md") => {
    const content = format === "md" 
      ? `# ${prompt.title}\n\n${prompt.description}\n\n## Prompt\n\n${prompt.body}\n\n## Variables\n\n${prompt.variables.map(v => `- \`{{${v}}}\``).join("\n")}`
      : prompt.body;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prompt.title.replace(/\s+/g, "-").toLowerCase()}.${format}`;
    a.click();
    
    toast({
      title: "Exported successfully",
      description: `Prompt exported as .${format} file.`,
    });
  };

  const generatePreview = (prompt: typeof promptTemplates[0]) => {
    let previewContent = prompt.body;
    Object.entries(previewVariables).forEach(([key, value]) => {
      previewContent = previewContent.replace(new RegExp(`{{${key}}}`, "g"), value || `[${key}]`);
    });
    return previewContent;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Prompt Library
          </h1>
          <p className="text-muted-foreground">Create, manage, and export AI prompt templates</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Create New Prompt Template</DialogTitle>
              <DialogDescription>
                Create a reusable prompt template with variable placeholders
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input placeholder="Enter prompt title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.slice(1).map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Visibility</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="project">Project Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input placeholder="Brief description of the prompt" />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Prompt Body</Label>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Insert Variable
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Make Lovable ✨
                    </Button>
                  </div>
                </div>
                <Textarea 
                  placeholder="Enter your prompt template. Use {{VARIABLE_NAME}} for placeholders..."
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label>Variables (comma-separated)</Label>
                <Input placeholder="PROJECT_NAME, DB_CONNECTION, TL_NAME" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1">Save as Draft</Button>
                <Button className="flex-1">Save & Preview</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{promptTemplates.length}</div>
            <p className="text-xs text-muted-foreground">Total Templates</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">
              {promptTemplates.filter(p => p.isApproved).length}
            </div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {promptTemplates.reduce((acc, p) => acc + p.uses, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total Uses</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">
              {promptTemplates.filter(p => !p.isApproved).length}
            </div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs & Search */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="bg-muted/50">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Prompt Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPrompts.map((prompt) => (
          <Card key={prompt.id} className="glass-card group hover:border-primary/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {prompt.title}
                    {prompt.isApproved && (
                      <CheckCircle className="h-4 w-4 text-status-success" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">{prompt.description}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setSelectedPrompt(prompt);
                      setShowPreview(true);
                    }}>
                      <Play className="mr-2 h-4 w-4" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopyPrompt(prompt)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport(prompt, "txt")}>
                      <Download className="mr-2 h-4 w-4" />
                      Export .txt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport(prompt, "md")}>
                      <Download className="mr-2 h-4 w-4" />
                      Export .md
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1">
                <StatusBadge variant="info">{prompt.category}</StatusBadge>
                <StatusBadge variant="neutral">v{prompt.version}</StatusBadge>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {prompt.variables.slice(0, 3).map((v) => (
                  <span key={v} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-mono">
                    <Tag className="h-2.5 w-2.5" />
                    {v}
                  </span>
                ))}
                {prompt.variables.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{prompt.variables.length - 3} more
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {prompt.uses} uses
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {prompt.lastUsed}
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {prompt.createdBy}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview: {selectedPrompt?.title}</DialogTitle>
            <DialogDescription>
              Fill in variables to preview the generated prompt
            </DialogDescription>
          </DialogHeader>
          {selectedPrompt && (
            <div className="grid gap-4 py-4 overflow-y-auto flex-1">
              <div className="grid gap-4 md:grid-cols-2">
                {selectedPrompt.variables.map((variable) => (
                  <div key={variable} className="grid gap-2">
                    <Label className="font-mono text-xs">{`{{${variable}}}`}</Label>
                    <Input
                      placeholder={`Enter ${variable}`}
                      value={previewVariables[variable] || ""}
                      onChange={(e) => setPreviewVariables({
                        ...previewVariables,
                        [variable]: e.target.value
                      })}
                    />
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                <Label>Generated Prompt Preview</Label>
                <div className="rounded-lg bg-muted p-4 font-mono text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {generatePreview(selectedPrompt)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleCopyPrompt(selectedPrompt)} className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" onClick={() => handleExport(selectedPrompt, "txt")} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Export .txt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
