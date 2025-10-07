import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { format } from "date-fns";

export default function RepSuspensionManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch all suspended reps (admin only)
  const { data: suspensions = [], isLoading } = useQuery({
    queryKey: ["/api/admin/rep-suspensions"],
    retry: false,
  });

  const filteredSuspensions = suspensions.filter((suspension) => {
    const matchesSearch =
      suspension.repName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suspension.repEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && suspension.isActive) ||
      (filterStatus === "expired" && !suspension.isActive);
    return matchesSearch && matchesFilter;
  });

  const getSuspensionStatusBadge = (suspension) => {
    if (!suspension.isActive) {
      return <Badge variant="secondary">Lifted</Badge>;
    }

    const endDate = new Date(suspension.endDate);
    const now = new Date();

    if (endDate < now) {
      return <Badge variant="outline">Expired</Badge>;
    }

    const variant = suspension.type === "90-day" ? "destructive" : "secondary";
    return <Badge variant={variant}>Active</Badge>;
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Rep Suspension Management
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor and manage sales rep suspensions
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Download className="mr-2" size={16} />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Suspensions
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {
                      suspensions.filter(
                        (s) => s.isActive && new Date(s.endDate) > new Date(),
                      ).length
                    }
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    90-Day Suspensions
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {suspensions.filter((s) => s.type === "90-day").length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Suspensions
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {suspensions.length}
                  </p>
                </div>
                <User className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <Input
                    placeholder="Search by rep name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("active")}
                >
                  Active
                </Button>
                <Button
                  variant={filterStatus === "expired" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus("expired")}
                >
                  Lifted/Expired
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suspensions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={20} />
              Rep Suspensions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSuspensions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No suspensions found matching your criteria.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSuspensions.map((suspension) => (
                  <div
                    key={suspension._id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {suspension.repName || "Sales Rep"}
                          </h3>
                          {getSuspensionStatusBadge(suspension)}
                          <Badge
                            variant="outline"
                            className={
                              suspension.type === "90-day"
                                ? "border-red-500 text-red-700"
                                : "border-orange-500 text-orange-700"
                            }
                          >
                            {suspension.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {suspension.suspensionReason}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>
                              {format(
                                new Date(suspension.startDate),
                                "MMM dd, yyyy",
                              )}{" "}
                              -{" "}
                              {format(
                                new Date(suspension.endDate),
                                "MMM dd, yyyy",
                              )}
                            </span>
                          </div>
                          {suspension.isActive &&
                            new Date(suspension.endDate) > new Date() && (
                              <div className="flex items-center gap-1">
                                <Clock size={12} />
                                <span>
                                  {getDaysRemaining(suspension.endDate)} days
                                  remaining
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                        {suspension.isActive && (
                          <Button size="sm" variant="destructive">
                            Lift Suspension
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
