import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { kanbanApi } from "../api";
import { projectsApi } from "@/features/projects/api";
import { toast } from "@/hooks/use-toast";

export default function Kanban() {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [boardForm, setBoardForm] = useState({
    name: "",
    description: "",
    project_id: "",
  });
  const queryClient = useQueryClient();

  // Fetch boards
  const { data: boardsData, isLoading } = useQuery({
    queryKey: ['kanban-boards'],
    queryFn: () => kanbanApi.getBoards(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch projects for dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const boards = boardsData?.data || [];
  const projects = projectsData?.data || [];

  // Create board mutation
  const createBoardMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; project_id?: number }) =>
      kanbanApi.createBoard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-boards'] });
      setShowCreateDialog(false);
      setBoardForm({ name: "", description: "", project_id: "" });
      toast({
        title: "Success",
        description: "Board created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create board.",
        variant: "destructive",
      });
    },
  });

  const handleCreateBoard = () => {
    if (!boardForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Board name is required.",
        variant: "destructive",
      });
      return;
    }

    createBoardMutation.mutate({
      name: boardForm.name.trim(),
      description: boardForm.description.trim() || undefined,
      project_id: boardForm.project_id ? parseInt(boardForm.project_id) : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <LayoutGrid className="h-8 w-8 animate-pulse text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading Kanban boards...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-8 w-8 text-primary" />
            Kanban Boards
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your tasks with visual Kanban boards
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Board
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Kanban Board</DialogTitle>
                <DialogDescription>
                  Create a new Kanban board to organize and track tasks visually.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="board-name">Board Name *</Label>
                  <Input
                    id="board-name"
                    placeholder="e.g., Sprint Board, Feature Development"
                    value={boardForm.name}
                    onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="board-description">Description</Label>
                  <Textarea
                    id="board-description"
                    placeholder="Optional description for this board"
                    value={boardForm.description}
                    onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="board-project">Project (Optional)</Label>
                  <Select
                    value={boardForm.project_id || "none"}
                    onValueChange={(value) => setBoardForm({ ...boardForm, project_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger id="board-project">
                      <SelectValue placeholder="Select a project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {projects.map((project: any) => (
                        <SelectItem key={project.id} value={String(project.id)}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setBoardForm({ name: "", description: "", project_id: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBoard}
                  disabled={createBoardMutation.isPending || !boardForm.name.trim()}
                >
                  {createBoardMutation.isPending ? "Creating..." : "Create Board"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Boards Grid */}
      {boards.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <LayoutGrid className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Kanban boards yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first Kanban board to start organizing tasks visually
              </p>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Board
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Kanban Board</DialogTitle>
                    <DialogDescription>
                      Create a new Kanban board to organize and track tasks visually.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="board-name-empty">Board Name *</Label>
                      <Input
                        id="board-name-empty"
                        placeholder="e.g., Sprint Board, Feature Development"
                        value={boardForm.name}
                        onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="board-description-empty">Description</Label>
                      <Textarea
                        id="board-description-empty"
                        placeholder="Optional description for this board"
                        value={boardForm.description}
                        onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="board-project-empty">Project (Optional)</Label>
                      <Select
                        value={boardForm.project_id || "none"}
                        onValueChange={(value) => setBoardForm({ ...boardForm, project_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger id="board-project-empty">
                          <SelectValue placeholder="Select a project (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {projects.map((project: any) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateDialog(false);
                        setBoardForm({ name: "", description: "", project_id: "" });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateBoard}
                      disabled={createBoardMutation.isPending || !boardForm.name.trim()}
                    >
                      {createBoardMutation.isPending ? "Creating..." : "Create Board"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board: any) => (
            <Card
              key={board.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/kanban/${board.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{board.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Open board settings
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                {board.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {board.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{board.task_count || 0} tasks</span>
                  {board.project_name && (
                    <span className="text-xs">Project: {board.project_name}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

