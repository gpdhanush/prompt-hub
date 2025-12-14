import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
// TODO: Fix import if path is incorrect or file does not exist.
// If "@/hooks/useDebounce" cannot be resolved, ensure the file exists, or update path as needed.
import { useDebounce } from "../hooks/useDebounce";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchApi } from "@/lib/api";
import { Loader2, Ticket, Bug, CheckSquare, FolderKanban, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons: Record<string, any> = {
  ticket: Ticket,
  bug: Bug,
  task: CheckSquare,
  project: FolderKanban,
  bug_comment: MessageSquare,
  task_comment: MessageSquare,
  ticket_comment: MessageSquare,
};

const typeLabels: Record<string, string> = {
  ticket: "Tickets",
  bug: "Bugs",
  task: "Tasks",
  project: "Projects",
  bug_comment: "Bug Comments",
  task_comment: "Task Comments",
  ticket_comment: "Ticket Comments",
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () => searchApi.global(debouncedQuery, 10),
    enabled: debouncedQuery.length >= 2 && open,
    retry: 1, // Only retry once on failure
    retryOnMount: false, // Don't retry when component remounts
  });

  const groups = data?.data?.groups || [];

  const handleSelect = (link: string) => {
    navigate(link);
    onOpenChange(false);
    setSearchQuery("");
  };

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search tickets, bugs, tasks, projects, comments..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <p className="text-sm text-destructive mb-2">Search failed</p>
            <p className="text-xs text-muted-foreground text-center">
              {error instanceof Error ? error.message : 'Please try again'}
            </p>
          </div>
        ) : isLoading && debouncedQuery.length >= 2 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : debouncedQuery.length < 2 ? (
          <CommandEmpty>
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Type at least 2 characters to search
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Search across tickets, bugs, tasks, projects, and comments
              </p>
            </div>
          </CommandEmpty>
        ) : groups.length === 0 ? (
          <CommandEmpty>No results found for "{debouncedQuery}"</CommandEmpty>
        ) : (
          groups.map((group) => {
            const Icon = typeIcons[group.type] || MessageSquare;
            return (
              <CommandGroup key={group.type} heading={group.label}>
                <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-2">
                  <Icon className="h-3 w-3" />
                  <span>{group.label}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {group.count}
                  </Badge>
                </div>
                {group.items.map((item: any) => (
                  <CommandItem
                    key={`${item.type}-${item.id}`}
                    value={`${item.type}-${item.id}`}
                    onSelect={() => handleSelect(item.link)}
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      {item.status && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    {item.preview && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
                        {item.preview}
                      </p>
                    )}
                    {item.created_at && (
                      <p className="text-xs text-muted-foreground pl-6">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })
        )}
      </CommandList>
    </CommandDialog>
  );
}
