import type { RankingItem } from "@/types";
import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { relativeTime } from "@/lib/utils";
import { Newspaper, TrendingUp } from "lucide-react";

interface TrendTableProps {
  rankingItems: RankingItem[];
  isLoading?: boolean;
}

export function TrendTable({ rankingItems, isLoading }: TrendTableProps) {
  const { setSelectedArticleId, setCurrentView } = useAppStore();

  const handleRowClick = (articleId: string) => {
    setSelectedArticleId(articleId);
    setCurrentView("studio");
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">趋势榜单</CardTitle>
            <CardDescription>点击文章进入内容工作室</CardDescription>
          </div>
          <Newspaper size={16} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>标题</TableHead>
              <TableHead className="hidden sm:table-cell">来源</TableHead>
              <TableHead>热度</TableHead>
              <TableHead>增长</TableHead>
              <TableHead className="hidden md:table-cell">时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && rankingItems.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-10" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : rankingItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  暂无榜单数据，点击上方“采集”按钮开始抓取
                </TableCell>
              </TableRow>
            ) : (
              rankingItems.map((item, index) => {
                const { article, score } = item;
                const rank = score.rank || article.rank || index + 1;
                const heat = Math.round(
                  (score.hot_score ?? article.score ?? 0) * 100
                );
                const growth = Math.round((score.recency_score ?? 0) * 100);

                return (
                  <TableRow
                    key={article.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(article.id)}
                  >
                    <TableCell className="font-medium">{rank}</TableCell>
                    <TableCell>
                      <div className="min-w-[200px] max-w-[420px] whitespace-normal text-sm font-medium leading-snug">
                        {article.title}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs font-normal">
                        {article.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs font-semibold">
                        <TrendingUp size={12} />
                        {heat}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={growth >= 50 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {growth > 0 ? `+${growth}` : growth}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {relativeTime(article.published_at || article.collected_at)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
