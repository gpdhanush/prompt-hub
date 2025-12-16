import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { projectsApi } from "@/features/projects/api";
import { toast } from "@/hooks/use-toast";
import type { Project } from "../utils/utils";

interface UseProjectsQueryParams {
  page: number;
  limit: number;
  viewFilter: 'all' | 'my';
}

export const useProjectsQuery = ({ page, limit, viewFilter }: UseProjectsQueryParams) => {
  return useQuery({
    queryKey: ['projects', viewFilter, page, limit],
    queryFn: () => projectsApi.getAll({ 
      page, 
      limit, 
      my_projects: viewFilter === 'my' ? 1 : undefined 
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useProjectMutations = () => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Success", description: "Project deleted successfully." });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({ 
          title: "Authentication Required", 
          description: "Please login to continue.",
          variant: "destructive",
        });
        window.location.href = '/login';
      } else if (error.status === 403) {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to delete projects.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to delete project." });
      }
    },
  });

  const handleDelete = useCallback((projectId: number) => {
    deleteMutation.mutate(projectId);
  }, [deleteMutation]);

  return {
    deleteMutation,
    handleDelete,
  };
};
