import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Users, Calendar, UserCheck, UserX, XCircle, TrendingUp, QrCode, Edit, Plus, Trash2 } from "lucide-react";
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
  const [addDialog, setAddDialog] = useState(false);
  const [newReport, setNewReport] = useState({
    report_date: format(new Date(), "yyyy-MM-dd"),
    branch: "",
    reception: {
      new_patients: 0,
      old_patients: 0,
      appointments: 0,
      no_shows: 0,
      youtube_qr_scans: 0,
      instagram_qr_scans: 0,
      facebook_qr_scans: 0
    }
  });

  const queryClient = useQueryClient();

  useState(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user.department !== "Analyst" && user.department !== "CEO" && user.role !== "admin" && user.branch) {
        setSelectedBranch(user.branch);
      }
    }).catch(() => {});
  }, []);

  const { data: branchReports = [], isLoading } = useQuery({
    queryKey: ["branchReports"],
    queryFn: () => base44.entities.BranchReport.list("-report_date", 500)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BranchReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchReports"] });
      setAddDialog(false);
      setNewReport({
        report_date: format(new Date(), "yyyy-MM-dd"),
        branch: "",
        reception: {
          new_patients: 0,
          old_patients: 0,
          appointments: 0,
          no_shows: 0,
          youtube_qr_scans: 0,
          instagram_qr_scans: 0,
          facebook_qr_scans: 0
        }
      });
      toast.success("Report added successfully");
    },
    onError: () => {
      toast.error("Failed to add report");
    }
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BranchReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchReports"] });
      toast.success("Report deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete report");
    }
  });

  const filteredReports = branchReports.filter(report => {
    const reportDate = parseISO(report.report_date);
    const inRange = isWithinInterval(reportDate, { start: dateRange.from, end: dateRange.to });
    const matchesBranch = selectedBranch === "All Branches" || report.branch === selectedBranch;
    return inRange && matchesBranch;
  });

  // KPIs
  const totalNewPatients = filteredReports.reduce((sum, r) => sum + (r.reception?.new_patients || 0), 0);
  const totalOldPatients = filteredReports.reduce((sum, r) => sum + (r.reception?.old_patients || 0), 0);
  const totalConsultations = totalNewPatients + totalOldPatients;
  const totalAppointments = filteredReports.reduce((sum, r) => sum + (r.reception?.appointments || 0), 0);
  const totalNoShows = filteredReports.reduce((sum, r) => sum + (r.reception?.no_shows || 0), 0);
  const totalYoutubeScans = filteredReports.reduce((sum, r) => sum + (r.reception?.youtube_qr_scans || 0), 0);
  const totalInstagramScans = filteredReports.reduce((sum, r) => sum + (r.reception?.instagram_qr_scans || 0), 0);
  const totalFacebookScans = filteredReports.reduce((sum, r) => sum + (r.reception?.facebook_qr_scans || 0), 0);

  const noShowRate = totalAppointments > 0 ? ((totalNoShows / totalAppointments) * 100).toFixed(1) : 0;

  // Trend data
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredReports.filter(r => r.report_date === dateStr);
    const newPat = dayReports.reduce((sum, r) => sum + (r.reception?.new_patients || 0), 0);
    const oldPat = dayReports.reduce((sum, r) => sum + (r.reception?.old_patients || 0), 0);
    trendData.push({
      date: format(currentDate, "MMM d"),
      newPatients: newPat,
      oldPatients: oldPat,
      consultations: newPat + oldPat,
      appointments: dayReports.reduce((sum, r) => sum + (r.reception?.appointments || 0), 0),
      noShows: dayReports.reduce((sum, r) => sum + (r.reception?.no_shows || 0), 0)
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Branch comparison
  const branchData = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    const newPat = data.reduce((sum, r) => sum + (r.reception?.new_patients || 0), 0);
    const oldPat = data.reduce((sum, r) => sum + (r.reception?.old_patients || 0), 0);
    return {
      branch,
      value: newPat + oldPat
    };
  });

  // Table data
  const tableData = filteredReports.map(r => ({
    id: r.id,
    report: r,
    date: format(parseISO(r.report_date), "MMM d, yyyy"),
    branch: r.branch,
    newPatients: r.reception?.new_patients || 0,
    oldPatients: r.reception?.old_patients || 0,
    consultations: (r.reception?.new_patients || 0) + (r.reception?.old_patients || 0),
    appointments: r.reception?.appointments || 0,
    noShows: r.reception?.no_shows || 0,
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
            <p className="text-sm text-slate-500 mt-1">Consultations, appointments & QR scans</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Report
            </Button>
            {currentUser?.department === "Analyst" || currentUser?.department === "CEO" || currentUser?.role === "admin" ? (
              <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            ) : (
              <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700">
                {currentUser?.branch || "No branch"}
              </div>
            )}
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* Quick Branch Filters for Analyst, CEO & Admin */}
        {(currentUser?.department === "Analyst" || currentUser?.department === "CEO" || currentUser?.role === "admin") && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={selectedBranch === "All Branches" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedBranch("All Branches")}
              className={selectedBranch === "All Branches" ? "bg-indigo-600" : ""}
            >
              All Branches
            </Button>
            {BRANCHES.map(branch => (
              <Button
                key={branch}
                variant={selectedBranch === branch ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBranch(branch)}
                className={selectedBranch === branch ? "bg-indigo-600" : ""}
              >
                {branch}
              </Button>
            ))}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KPICard title="Total Consultations" value={totalConsultations} icon={Users} trend="up" change={8} />
          <KPICard title="New Patients" value={totalNewPatients} icon={UserCheck} trend="up" />
          <KPICard title="Old Patients" value={totalOldPatients} icon={Users} trend="up" />
          <KPICard title="Appointments" value={totalAppointments} icon={Calendar} trend="up" change={12} />
          <KPICard title="No-shows" value={totalNoShows} icon={UserX} trend={totalNoShows > 0 ? "down" : "up"} />
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
              { dataKey: "newPatients", name: "New Patients" },
              { dataKey: "oldPatients", name: "Old Patients" },
              { dataKey: "appointments", name: "Appointments" }
            ]}
          />
          {selectedBranch === "All Branches" && (
            <BranchComparisonChart
              title="Consultations by Branch"
              data={branchData}
              dataKey="value"
              metric="Consultations"
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
            { header: "New Patients", accessor: "newPatients" },
            { header: "Old Patients", accessor: "oldPatients" },
            { header: "Total", accessor: "consultations" },
            { header: "Appointments", accessor: "appointments" },
            { header: "No-shows", accessor: "noShows" },
            { header: "YouTube", accessor: "youtubeScans" },
            { header: "Instagram", accessor: "instagramScans" },
            { header: "Facebook", accessor: "facebookScans" },
            { 
              header: "Action", 
              accessor: "id", 
              render: (_, row) => (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditDialog(row.report)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (confirm("Are you sure you want to delete this report?")) {
                      deleteMutation.mutate(row.id);
                    }
                  }}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )
            }
          ]}
        />

        {/* Add Dialog */}
        {addDialog && (
          <Dialog open={addDialog} onOpenChange={setAddDialog}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Reception Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newReport.report_date}
                      onChange={(e) => setNewReport({ ...newReport, report_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Branch</Label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-md"
                      value={newReport.branch}
                      onChange={(e) => setNewReport({ ...newReport, branch: e.target.value })}
                    >
                      <option value="">Select Branch</option>
                      {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  
                  <div className="col-span-2 pt-3 pb-2 border-t border-slate-200">
                    <Label className="text-sm font-semibold text-slate-700">Consultation</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>New Patients</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.reception.new_patients}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        reception: { ...newReport.reception, new_patients: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Old Patients</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.reception.old_patients}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        reception: { ...newReport.reception, old_patients: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  
                  <div className="col-span-2 pt-3 pb-2 border-t border-slate-200">
                    <Label className="text-sm font-semibold text-slate-700">Appointments & No-shows</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Appointments</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.reception.appointments}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        reception: { ...newReport.reception, appointments: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>No-shows</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.reception.no_shows}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        reception: { ...newReport.reception, no_shows: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  
                  <div className="col-span-2 pt-3 pb-2 border-t border-slate-200">
                    <Label className="text-sm font-semibold text-slate-700">QR Code Scans</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube QR</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.reception.youtube_qr_scans}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        reception: { ...newReport.reception, youtube_qr_scans: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram QR</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.reception.instagram_qr_scans}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        reception: { ...newReport.reception, instagram_qr_scans: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook QR</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.reception.facebook_qr_scans}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        reception: { ...newReport.reception, facebook_qr_scans: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setAddDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createMutation.mutate(newReport)}
                    disabled={createMutation.isPending || !newReport.branch}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {createMutation.isPending ? "Adding..." : "Add Report"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dialog */}
        {editDialog && (
          <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Reception Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 pb-2 border-b border-slate-200">
                    <Label className="text-sm font-semibold text-slate-700">Consultation</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>New Patients</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.new_patients ?? ''}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, new_patients: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Old Patients</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.old_patients ?? ''}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, old_patients: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  
                  <div className="col-span-2 pt-3 pb-2 border-t border-slate-200">
                    <Label className="text-sm font-semibold text-slate-700">Appointments & No-shows</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Appointments</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.appointments ?? ''}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, appointments: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>No-shows</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.no_shows ?? ''}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, no_shows: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  
                  <div className="col-span-2 pt-3 pb-2 border-t border-slate-200">
                    <Label className="text-sm font-semibold text-slate-700">QR Code Scans</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube QR</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.youtube_qr_scans ?? ''}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, youtube_qr_scans: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram QR</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.instagram_qr_scans ?? ''}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, instagram_qr_scans: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook QR</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.reception?.facebook_qr_scans ?? ''}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        reception: { ...editDialog.reception, facebook_qr_scans: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
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