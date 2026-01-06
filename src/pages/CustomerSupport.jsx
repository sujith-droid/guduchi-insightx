import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Phone, PhoneOutgoing, Calendar, Users, CheckCircle, Flame, Edit, Plus, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];

export default function CustomerSupport() {
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
    customer_support: {
      total_answered_calls: 0,
      total_appointments: 0,
      total_outbound_calls: 0,
      executive_data: []
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
        customer_support: {
          total_answered_calls: 0,
          total_appointments: 0,
          total_outbound_calls: 0,
          executive_data: []
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
  const totalAnsweredCalls = filteredReports.reduce((sum, r) => sum + (r.customer_support?.total_answered_calls || 0), 0);
  const totalAppointments = filteredReports.reduce((sum, r) => sum + (r.customer_support?.total_appointments || 0), 0);
  const totalOutboundCalls = filteredReports.reduce((sum, r) => sum + (r.customer_support?.total_outbound_calls || 0), 0);

  // Get all unique executives from all reports
  const allExecutives = new Set();
  filteredReports.forEach(r => {
    r.customer_support?.executive_data?.forEach(exec => {
      if (exec.executive_name) allExecutives.add(exec.executive_name);
    });
  });

  // Aggregate executive data
  const executiveAggregates = Array.from(allExecutives).map(execName => {
    const execData = {
      name: execName,
      appointments: 0,
      followups: 0,
      confirmed: 0,
      warm: 0
    };
    
    filteredReports.forEach(r => {
      const exec = r.customer_support?.executive_data?.find(e => e.executive_name === execName);
      if (exec) {
        execData.appointments += exec.appointment_count || 0;
        execData.followups += exec.followups || 0;
        execData.confirmed += exec.confirmed_appointments || 0;
        execData.warm += exec.warm_appointments || 0;
      }
    });
    
    return execData;
  });

  // Trend data
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredReports.filter(r => r.report_date === dateStr);
    trendData.push({
      date: format(currentDate, "MMM d"),
      answered: dayReports.reduce((sum, r) => sum + (r.customer_support?.total_answered_calls || 0), 0),
      appointments: dayReports.reduce((sum, r) => sum + (r.customer_support?.total_appointments || 0), 0),
      outbound: dayReports.reduce((sum, r) => sum + (r.customer_support?.total_outbound_calls || 0), 0)
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Branch comparison
  const branchData = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    return {
      branch,
      value: data.reduce((sum, r) => sum + (r.customer_support?.total_answered_calls || 0), 0)
    };
  });

  // Table data
  const tableData = filteredReports.map(r => ({
    id: r.id,
    report: r,
    date: format(parseISO(r.report_date), "MMM d, yyyy"),
    branch: r.branch,
    answered: r.customer_support?.total_answered_calls || 0,
    appointments: r.customer_support?.total_appointments || 0,
    outbound: r.customer_support?.total_outbound_calls || 0
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Customer Support</h1>
            <p className="text-sm text-slate-500 mt-1">Call handling & appointment management</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <KPICard title="Answered Calls" value={totalAnsweredCalls} icon={Phone} trend="up" change={5} />
          <KPICard title="Total Appointments" value={totalAppointments} icon={Calendar} trend="up" change={10} />
          <KPICard title="Outbound Calls" value={totalOutboundCalls} icon={PhoneOutgoing} trend="up" change={8} />
        </div>

        {/* Executive Performance */}
        {executiveAggregates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Executive Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {executiveAggregates.map(exec => (
                <Card key={exec.name} className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      {exec.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{exec.appointments}</p>
                        <p className="text-xs text-slate-500">Appointments</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{exec.followups}</p>
                        <p className="text-xs text-slate-500">Follow-ups</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-emerald-600">{exec.confirmed}</p>
                        <p className="text-xs text-slate-500">Confirmed</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-orange-600">{exec.warm}</p>
                        <p className="text-xs text-slate-500">Warm</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TrendChart
            title="Daily Activity Trend"
            data={trendData}
            lines={[
              { dataKey: "answered", name: "Answered Calls" },
              { dataKey: "appointments", name: "Appointments" },
              { dataKey: "outbound", name: "Outbound Calls" }
            ]}
          />
          {selectedBranch === "All Branches" && (
            <BranchComparisonChart
              title="Answered Calls by Branch"
              data={branchData}
              dataKey="value"
              metric="Calls"
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
            { header: "Answered Calls", accessor: "answered" },
            { header: "Appointments", accessor: "appointments" },
            { header: "Outbound Calls", accessor: "outbound" },
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Customer Support Report</DialogTitle>
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
                  <div className="space-y-2 col-span-2">
                    <Label>Total Answered Calls</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.customer_support.total_answered_calls}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        customer_support: { ...newReport.customer_support, total_answered_calls: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Total Appointments</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.customer_support.total_appointments}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        customer_support: { ...newReport.customer_support, total_appointments: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Total Outbound Calls</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.customer_support.total_outbound_calls}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        customer_support: { ...newReport.customer_support, total_outbound_calls: parseInt(e.target.value) || 0 }
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Customer Support Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Total Answered Calls</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.customer_support?.total_answered_calls || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        customer_support: { ...editDialog.customer_support, total_answered_calls: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Total Appointments</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.customer_support?.total_appointments || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        customer_support: { ...editDialog.customer_support, total_appointments: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Total Outbound Calls</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.customer_support?.total_outbound_calls || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        customer_support: { ...editDialog.customer_support, total_outbound_calls: parseInt(e.target.value) || 0 }
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