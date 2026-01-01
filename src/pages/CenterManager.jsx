import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Users, DollarSign, TrendingUp, TrendingDown, Building2, Edit, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import ReportTable from "@/components/dashboard/ReportTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];

export default function CenterManager() {
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
    center_manager: {
      number_of_patients: 0,
      revenue: 0,
      operational_notes: ""
    }
  });

  const queryClient = useQueryClient();

  useState(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user.department !== "Analyst" && user.department !== "CEO" && user.branch) {
        setSelectedBranch(user.branch);
      }
    }).catch(() => {});
  }, []);

  const { data: branchReports = [], isLoading } = useQuery({
    queryKey: ["branchReports"],
    queryFn: () => base44.entities.BranchReport.list("-report_date", 500)
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Check if report exists for same date and branch
      const existing = branchReports.find(
        r => r.report_date === data.report_date && r.branch === data.branch
      );
      
      if (existing) {
        // Update existing report instead of creating duplicate
        return await base44.entities.BranchReport.update(existing.id, data);
      }
      
      return await base44.entities.BranchReport.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchReports"] });
      setAddDialog(false);
      setNewReport({
        report_date: format(new Date(), "yyyy-MM-dd"),
        branch: "",
        center_manager: {
          number_of_patients: 0,
          revenue: 0,
          operational_notes: ""
        }
      });
      toast.success("Report saved successfully");
    },
    onError: () => {
      toast.error("Failed to save report");
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
  const totalPatients = filteredReports.reduce((sum, r) => sum + (r.center_manager?.number_of_patients || 0), 0);
  const totalRevenue = filteredReports.reduce((sum, r) => sum + (r.center_manager?.revenue || 0), 0);
  const totalProjectedPatients = filteredReports.reduce((sum, r) => sum + (r.center_manager?.projected_patients || 0), 0);
  const totalProjectedRevenue = filteredReports.reduce((sum, r) => sum + (r.center_manager?.projected_revenue || 0), 0);

  const patientDeviation = totalProjectedPatients > 0 
    ? (((totalPatients - totalProjectedPatients) / totalProjectedPatients) * 100).toFixed(1) 
    : 0;
  const revenueDeviation = totalProjectedRevenue > 0 
    ? (((totalRevenue - totalProjectedRevenue) / totalProjectedRevenue) * 100).toFixed(1) 
    : 0;

  // Branch summaries
  const branchSummaries = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    const patients = data.reduce((sum, r) => sum + (r.center_manager?.number_of_patients || 0), 0);
    const revenue = data.reduce((sum, r) => sum + (r.center_manager?.revenue || 0), 0);
    const projPatients = data.reduce((sum, r) => sum + (r.center_manager?.projected_patients || 0), 0);
    const projRevenue = data.reduce((sum, r) => sum + (r.center_manager?.projected_revenue || 0), 0);
    
    const patDev = projPatients > 0 ? (((patients - projPatients) / projPatients) * 100).toFixed(1) : 0;
    const revDev = projRevenue > 0 ? (((revenue - projRevenue) / projRevenue) * 100).toFixed(1) : 0;
    
    return {
      branch,
      patients,
      revenue,
      patientDeviation: patDev,
      revenueDeviation: revDev,
      status: parseFloat(patDev) >= 0 && parseFloat(revDev) >= 0 ? "good" : "warning"
    };
  });

  // Table data
  const tableData = filteredReports.map(r => {
    const patDev = r.center_manager?.projected_patients > 0 
      ? (((r.center_manager?.number_of_patients || 0) - r.center_manager?.projected_patients) / r.center_manager?.projected_patients * 100).toFixed(1)
      : 0;
    const revDev = r.center_manager?.projected_revenue > 0 
      ? (((r.center_manager?.revenue || 0) - r.center_manager?.projected_revenue) / r.center_manager?.projected_revenue * 100).toFixed(1)
      : 0;
    
    return {
      id: r.id,
      report: r,
      date: format(parseISO(r.report_date), "MMM d, yyyy"),
      branch: r.branch,
      patients: r.center_manager?.number_of_patients || 0,
      projectedPatients: r.center_manager?.projected_patients || 0,
      patientDev: patDev,
      revenue: r.center_manager?.revenue || 0,
      projectedRevenue: r.center_manager?.projected_revenue || 0,
      revenueDev: revDev,
      trackingDays: r.center_manager?.tracking_days || 30,
      notes: r.center_manager?.operational_notes || ""
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Center Manager</h1>
            <p className="text-sm text-slate-500 mt-1">Patient count, revenue & performance tracking</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Report
            </Button>
            {currentUser?.department === "Analyst" || currentUser?.department === "CEO" ? (
              <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            ) : (
              <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700">
                {currentUser?.branch || "No branch"}
              </div>
            )}
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* Quick Branch Filters for Analyst & CEO */}
        {(currentUser?.department === "Analyst" || currentUser?.department === "CEO") && (
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard 
            title="Total Patients" 
            value={totalPatients} 
            icon={Users} 
            trend={parseFloat(patientDeviation) >= 0 ? "up" : "down"}
            subtitle={`${patientDeviation}% vs projected`}
          />
          <KPICard 
            title="Total Revenue" 
            value={`₹${(totalRevenue / 1000).toFixed(1)}K`} 
            icon={DollarSign} 
            trend={parseFloat(revenueDeviation) >= 0 ? "up" : "down"}
            subtitle={`${revenueDeviation}% vs projected`}
          />
          <KPICard 
            title="Patient Deviation" 
            value={`${patientDeviation}%`} 
            icon={parseFloat(patientDeviation) >= 0 ? TrendingUp : TrendingDown}
            trend={parseFloat(patientDeviation) >= 0 ? "up" : "down"}
          />
          <KPICard 
            title="Revenue Deviation" 
            value={`${revenueDeviation}%`} 
            icon={parseFloat(revenueDeviation) >= 0 ? TrendingUp : TrendingDown}
            trend={parseFloat(revenueDeviation) >= 0 ? "up" : "down"}
          />
        </div>

        {/* Branch Summaries */}
        {selectedBranch === "All Branches" && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Branch Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branchSummaries.map(branch => (
                <Card key={branch.branch} className="border-0 shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {branch.branch}
                      </CardTitle>
                      <Badge variant="secondary" className={branch.status === "good" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                        {branch.status === "good" ? "On Track" : "Below Target"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{branch.patients}</p>
                        <p className="text-xs text-slate-500">Patients</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-slate-900">₹{(branch.revenue / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-slate-500">Revenue</p>
                      </div>
                      <div>
                        <p className={`text-xl font-semibold ${parseFloat(branch.patientDeviation) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {branch.patientDeviation}%
                        </p>
                        <p className="text-xs text-slate-500">Patient Dev.</p>
                      </div>
                      <div>
                        <p className={`text-xl font-semibold ${parseFloat(branch.revenueDeviation) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {branch.revenueDeviation}%
                        </p>
                        <p className="text-xs text-slate-500">Revenue Dev.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <ReportTable
          title="Daily Reports"
          data={tableData}
          columns={[
            { header: "Date", accessor: "date" },
            { header: "Branch", accessor: "branch" },
            { header: "Patients", accessor: "patients" },
            { header: "Proj. Patients", accessor: "projectedPatients" },
            { header: "Pat. Dev.", accessor: "patientDev", render: (val) => (
              <span className={parseFloat(val) >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                {val}%
              </span>
            )},
            { header: "Revenue", accessor: "revenue", render: (val) => `₹${val.toLocaleString()}` },
            { header: "Proj. Revenue", accessor: "projectedRevenue", render: (val) => `₹${val.toLocaleString()}` },
            { header: "Rev. Dev.", accessor: "revenueDev", render: (val) => (
              <span className={parseFloat(val) >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                {val}%
              </span>
            )},
            { header: "Days", accessor: "trackingDays" },
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
                <DialogTitle>Add Center Manager Report</DialogTitle>
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
                  <div className="space-y-2">
                    <Label>Number of Patients</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.center_manager.number_of_patients}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        center_manager: { ...newReport.center_manager, number_of_patients: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Revenue</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.center_manager.revenue}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        center_manager: { ...newReport.center_manager, revenue: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Operational Notes</Label>
                    <Textarea
                      value={newReport.center_manager.operational_notes}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        center_manager: { ...newReport.center_manager, operational_notes: e.target.value }
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
                <DialogTitle>Edit Center Manager Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Patients</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.center_manager?.number_of_patients || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        center_manager: { ...editDialog.center_manager, number_of_patients: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Revenue</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.center_manager?.revenue || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        center_manager: { ...editDialog.center_manager, revenue: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Operational Notes</Label>
                    <Textarea
                      value={editDialog.center_manager?.operational_notes || ""}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        center_manager: { ...editDialog.center_manager, operational_notes: e.target.value }
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