import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Users, Calendar, UserCheck, UserX, XCircle, TrendingUp, QrCode, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import TrendChart from "@/components/dashboard/TrendChart";
import BranchComparisonChart from "@/components/dashboard/BranchComparisonChart";
import ReportTable from "@/components/dashboard/ReportTable";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];

export default function Reception() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 6),
    to: new Date()
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [editDialog, setEditDialog] = useState(null);

  const queryClient = useQueryClient();

  useState(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user.department !== "Analyst" && user.branch) {
        setSelectedBranch(user.branch);
      }
    }).catch(() => {});
  }, []);

  const { data: branchReports = [], isLoading } = useQuery({
    queryKey: ["branchReports"],
    queryFn: () => base44.entities.BranchReport.list("-report_date", 500)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BranchReport.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchReports"] });
      setEditDialog(null);
      toast.success("Report updated successfully");
    },
    onError: () => {
      toast.error("Failed to update report");
    }
  });

  const filteredReports = branchReports.filter(report => {
    const reportDate = parseISO(report.report_date);
    const inRange = isWithinInterval(reportDate, { start: dateRange.from, end: dateRange.to });
    const matchesBranch = selectedBranch === "All Branches" || report.branch === selectedBranch;
    return inRange && matchesBranch;
  });

  // KPIs
  const totalWalkIns = filteredReports.reduce((sum, r) => sum + (r.reception?.walk_ins || 0), 0);
  const totalAppointments = filteredReports.reduce((sum, r) => sum + (r.reception?.appointments || 0), 0);
  const totalConversions = filteredReports.reduce((sum, r) => sum + (r.reception?.conversions || 0), 0);
  const totalNoShows = filteredReports.reduce((sum, r) => sum + (r.reception?.no_shows || 0), 0);
  const totalCancellations = filteredReports.reduce((sum, r) => sum + (r.reception?.cancellations || 0), 0);
  const totalYoutubeScans = filteredReports.reduce((sum, r) => sum + (r.reception?.youtube_qr_scans || 0), 0);
  const totalInstagramScans = filteredReports.reduce((sum, r) => sum + (r.reception?.instagram_qr_scans || 0), 0);
  const totalFacebookScans = filteredReports.reduce((sum, r) => sum + (r.reception?.facebook_qr_scans || 0), 0);

  const conversionRate = totalWalkIns > 0 ? ((totalConversions / totalWalkIns) * 100).toFixed(1) : 0;
  const noShowRate = totalAppointments > 0 ? ((totalNoShows / totalAppointments) * 100).toFixed(1) : 0;

  // Trend data
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredReports.filter(r => r.report_date === dateStr);
    trendData.push({
      date: format(currentDate, "MMM d"),
      walkIns: dayReports.reduce((sum, r) => sum + (r.reception?.walk_ins || 0), 0),
      appointments: dayReports.reduce((sum, r) => sum + (r.reception?.appointments || 0), 0),
      conversions: dayReports.reduce((sum, r) => sum + (r.reception?.conversions || 0), 0)
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Branch comparison
  const branchData = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    return {
      branch,
      value: data.reduce((sum, r) => sum + (r.reception?.walk_ins || 0), 0)
    };
  });

  // Table data
  const tableData = filteredReports.map(r => ({
    id: r.id,
    report: r,
    date: format(parseISO(r.report_date), "MMM d, yyyy"),
    branch: r.branch,
    walkIns: r.reception?.walk_ins || 0,
    appointments: r.reception?.appointments || 0,
    conversions: r.reception?.conversions || 0,
    noShows: r.reception?.no_shows || 0,
    cancellations: r.reception?.cancellations || 0,
    youtubeScans: r.reception?.youtube_qr_scans || 0,
    instagramScans: r.reception?.instagram_qr_scans || 0,
    facebookScans: r.reception?.facebook_qr_scans || 0
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Reception</h1>
            <p className="text-sm text-slate-500 mt-1">Walk-ins, appointments & QR scans</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {currentUser?.department === "Analyst" ? (
              <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            ) : (
              <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700">
                {currentUser?.branch || "No branch"}
              </div>
            )}
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KPICard title="Walk-ins" value={totalWalkIns} icon={Users} trend="up" change={8} />
          <KPICard title="Appointments" value={totalAppointments} icon={Calendar} trend="up" change={12} />
          <KPICard title="Conversions" value={totalConversions} icon={UserCheck} trend="up" change={15} />
          <KPICard title="No-shows" value={totalNoShows} icon={UserX} trend={totalNoShows > 0 ? "down" : "up"} />
          <KPICard title="Conversion Rate" value={`${conversionRate}%`} icon={TrendingUp} trend="up" />
        </div>

        {/* QR Code Scans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-red-500" />
                YouTube QR Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{totalYoutubeScans}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-pink-500" />
                Instagram QR Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{totalInstagramScans}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-500" />
                Facebook QR Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{totalFacebookScans}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TrendChart
            title="Daily Trend"
            data={trendData}
            lines={[
              { dataKey: "walkIns", name: "Walk-ins" },
              { dataKey: "appointments", name: "Appointments" },
              { dataKey: "conversions", name: "Conversions" }
            ]}
          />
          {selectedBranch === "All Branches" && (
            <BranchComparisonChart
              title="Walk-ins by Branch"
              data={branchData}
              dataKey="value"
              metric="Walk-ins"
            />
          )}
        </div>

        {/* Table */}
        <ReportTable
          title="Daily Reports"
          data={tableData}
          columns={[
            { header: "Date", accessor: "date" },
            { header: "Branch", accessor: "branch" },
            { header: "Walk-ins", accessor: "walkIns" },
            { header: "Appointments", accessor: "appointments" },
            { header: "Conversions", accessor: "conversions" },
            { header: "No-shows", accessor: "noShows" },
            { header: "Cancellations", accessor: "cancellations" },
            { header: "YouTube", accessor: "youtubeScans" },
            { header: "Instagram", accessor: "instagramScans" },
            { header: "Facebook", accessor: "facebookScans" },
            { 
              header: "Action", 
              accessor: "id", 
              render: (_, row) => (
                <Button variant="ghost" size="sm" onClick={() => setEditDialog(row.report)}>
                  <Edit className="w-4 h-4" />
                </Button>
              )
            }
          ]}
        />

        {/* Edit Dialog */}
        {editDialog && (
          <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Reception Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Walk-ins</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.walk_ins || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, walk_ins: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Appointments</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.appointments || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, appointments: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conversions</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.conversions || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, conversions: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>No-shows</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.no_shows || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, no_shows: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cancellations</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.cancellations || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, cancellations: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube QR</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.youtube_qr_scans || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, youtube_qr_scans: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram QR</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.instagram_qr_scans || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, instagram_qr_scans: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook QR</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.facebook_qr_scans || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, facebook_qr_scans: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditDialog(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => updateMutation.mutate({ id: editDialog.id, data: editDialog })}
                    disabled={updateMutation.isPending}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}