import { memo } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";

interface LeaderboardProps {
  leaderboard: any[];
}

const Leaderboard = memo(function Leaderboard({ leaderboard }: LeaderboardProps) {
  if (leaderboard.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top Performers - This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Tasks Completed</TableHead>
              <TableHead className="text-center">Bugs Fixed</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((performer: any) => (
              <TableRow key={performer.rank}>
                <TableCell className="font-medium">{performer.rank}</TableCell>
                <TableCell className="font-medium">{performer.name}</TableCell>
                <TableCell className="text-center">{performer.tasks}</TableCell>
                <TableCell className="text-center">{performer.bugs}</TableCell>
                <TableCell className="text-right">
                  <StatusBadge
                    variant={
                      performer.score >= 95
                        ? "success"
                        : performer.score >= 90
                        ? "info"
                        : "neutral"
                    }
                  >
                    {performer.score}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
});

Leaderboard.displayName = "Leaderboard";

export default Leaderboard;

