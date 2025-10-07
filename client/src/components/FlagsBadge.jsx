import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Flag } from "lucide-react";
import { Link } from "wouter";

export default function FlagsBadge() {
  const { data: flagData, isLoading } = useQuery({
    queryKey: ["/api/user/flags-count"],
    retry: false,
  });

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  const flagCount = flagData?.flags || 0;

  // Determine badge color based on flag count
  const getBadgeColor = (count) => {
    if (count === 0) {
      return "bg-green-100 text-green-600 border-green-200 hover:bg-green-200";
    } else if (count >= 1 && count <= 2) {
      return "bg-yellow-100 text-yellow-600 border-yellow-200 hover:bg-yellow-200";
    } else {
      return "bg-red-100 text-red-600 border-red-200 hover:bg-red-200";
    }
  };

  const badgeContent = (
    <Badge
      className={`${getBadgeColor(flagCount)} cursor-pointer transition-colors`}
    >
      <Flag className="w-3 h-3 mr-1" />
      {flagCount} Flag{flagCount > 1 ? "s" : ""}
    </Badge>
  );

  // Only wrap in Link if there are flags to show
  if (flagCount === 0) {
    return badgeContent;
  }

  return <Link href="/flags">{badgeContent}</Link>;
}
