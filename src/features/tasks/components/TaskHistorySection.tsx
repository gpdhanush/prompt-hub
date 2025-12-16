import { useMemo, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, History, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { tasksApi } from "@/features/tasks/api";

interface TaskHistorySectionProps {
  taskId: number;
}

export const TaskHistorySection = memo(function TaskHistorySection({ taskId }: TaskHistorySectionProps) {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['task-history', taskId],
    queryFn: () => tasksApi.getHistory(taskId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const history = historyData?.data || [];

  const formatTimeAgo = useCallback((date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }, []);

  const formatDateTime = useCallback((date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Clock className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No history recorded yet.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical Stepper Line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border"></div>
          
          <div className="space-y-0">
            {history.map((entry: any) => (
              <div key={entry.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                {/* Stepper Circle */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
                  <History className="h-5 w-5 text-primary" />
                </div>
                
                {/* Content Card */}
                <div className="flex-1 min-w-0 rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">{entry.changed_by_name || 'Unknown'}</p>
                        <Badge variant="outline" className="text-xs">
                          {formatTimeAgo(entry.timestamp)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs font-normal">
                          {entry.from_status || 'N/A'}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="default" className="text-xs">
                          {entry.to_status || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                  {entry.note && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">{entry.note}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

