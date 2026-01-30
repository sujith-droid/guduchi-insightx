import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Target, TrendingUp, Phone, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import TrendChart from "@/components/dashboard/TrendChart";
import BranchComparisonChart from "@/components/dashboard/BranchComparisonChart";
import ReportTable from "@/components/dashboard/ReportTable";
import MonthlyTracker from "@/components/dashboard/MonthlyTracker";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];

export default function Marketing() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 6),
    to: new Date()
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newReport, setNewReport] = useState({
    report_date: format(new Date(), "yyyy-MM-dd"),
    branch: "Bangalore",
    call_leads: 0,
    whatsapp_leads: 0,
    instant_form_leads: 0,
    notes: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      // Digital Marketing, Analyst, CEO and Admin can see all branches
      if (user.department !== "Analyst" && user.department !== "Digital Marketing" && user.department !== "CEO" && user.role !== "admin" && user.branch) {
        setSelectedBranch(user.branch);
      }
    }).catch(() => {});
  }, []);

  const { data: marketingReports = [], isLoading } = useQuery({
    queryKey: ["marketingReports"],
    queryFn: () => base44.entities.MarketingReport.list("-report_date", 500)
  });

  const createReportMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketingReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketingReports"] });
      setShowAddDialog(false);
      setNewReport({
        report_date: format(new Date(), "yyyy-MM-dd"),
        branch: "Bangalore",
        call_leads: 0,
        whatsapp_leads: 0,
        instant_form_leads: 0,
        notes: ""
      });
      toast.success("Marketing report added successfully");
    },
    onError: () => {
      toast.error("Failed to add report");
    }
  });

  const [editDialog, setEditDialog] = useState(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MarketingReport.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketingReports"] });
      setEditDialog(null);
      toast.success("Report updated successfully");
    },
    onError: () => {
      toast.error("Failed to update report");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketingReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketingReports"] });
      toast.success("Report deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete report");
    }
  });

  const handleSubmitReport = () => {
    createReportMutation.mutate(newReport);
  };

  const filteredReports = marketingReports.filter(report => {
    const reportDate = parseISO(report.report_date);
    const inRange = isWithinInterval(reportDate, { start: dateRange.from, end: dateRange.to });
    const matchesBranch = selectedBranch === "All Branches" || report.branch === selectedBranch;
    return inRange && matchesBranch;
  });

  // Previous period for comparison
  const daysDiff = Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)) + 1;
  const previousPeriodStart = subDays(dateRange.from, daysDiff);
  const previousPeriodEnd = subDays(dateRange.to, daysDiff);
  
  const previousReports = marketingReports.filter(report => {
    const reportDate = parseISO(report.report_date);
    const inRange = isWithinInterval(reportDate, { start: previousPeriodStart, end: previousPeriodEnd });
    const matchesBranch = selectedBranch === "All Branches" || report.branch === selectedBranch;
    return inRange && matchesBranch;
  });

  // Current period KPIs
  const totalCallLeads = filteredReports.reduce((sum, r) => sum + (r.call_leads || 0), 0);
  const totalWhatsappLeads = filteredReports.reduce((sum, r) => sum + (r.whatsapp_leads || 0), 0);
  const totalInstantFormLeads = filteredReports.reduce((sum, r) => sum + (r.instant_form_leads || 0), 0);
  const totalLeads = totalCallLeads + totalWhatsappLeads + totalInstantFormLeads;
  const avgLeadsPerDay = filteredReports.length > 0 ? (totalLeads / filteredReports.length).toFixed(1) : 0;

  // Previous period KPIs
  const prevCallLeads = previousReports.reduce((sum, r) => sum + (r.call_leads || 0), 0);
  const prevWhatsappLeads = previousReports.reduce((sum, r) => sum + (r.whatsapp_leads || 0), 0);
  const prevInstantFormLeads = previousReports.reduce((sum, r) => sum + (r.instant_form_leads || 0), 0);
  const prevTotalLeads = prevCallLeads + prevWhatsappLeads + prevInstantFormLeads;

  // Calculate percentage changes
  const totalLeadsChange = prevTotalLeads > 0 ? (((totalLeads - prevTotalLeads) / prevTotalLeads) * 100).toFixed(1) : 0;
  const callLeadsChange = prevCallLeads > 0 ? (((totalCallLeads - prevCallLeads) / prevCallLeads) * 100).toFixed(1) : 0;
  const whatsappLeadsChange = prevWhatsappLeads > 0 ? (((totalWhatsappLeads - prevWhatsappLeads) / prevWhatsappLeads) * 100).toFixed(1) : 0;
  const formLeadsChange = prevInstantFormLeads > 0 ? (((totalInstantFormLeads - prevInstantFormLeads) / prevInstantFormLeads) * 100).toFixed(1) : 0;

  // Trend data
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredReports.filter(r => r.report_date === dateStr);
    trendData.push({
      date: format(currentDate, "MMM d"),
      callLeads: dayReports.reduce((sum, r) => sum + (r.call_leads || 0), 0),
      whatsappLeads: dayReports.reduce((sum, r) => sum + (r.whatsapp_leads || 0), 0),
      instantFormLeads: dayReports.reduce((sum, r) => sum + (r.instant_form_leads || 0), 0)
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Branch comparison
  const branchData = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    return {
      branch,
      value: data.reduce((sum, r) => sum + (r.call_leads || 0) + (r.whatsapp_leads || 0) + (r.instant_form_leads || 0), 0)
    };
  });

  // Table data
  const tableData = filteredReports.map(r => ({
    id: r.id,
    report: r,
    date: format(parseISO(r.report_date), "MMM d, yyyy"),
    branch: r.branch,
    call: r.call_leads || 0,
    whatsapp: r.whatsapp_leads || 0,
    instant: r.instant_form_leads || 0,
    total: (r.call_leads || 0) + (r.whatsapp_leads || 0) + (r.instant_form_leads || 0),
    notes: r.notes || ""
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Digital Marketing</h1>
            <p className="text-sm text-slate-500 mt-1">Daily lead tracking</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {currentUser?.department === "Digital Marketing" && (
              <Button onClick={() => setShowAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Report
              </Button>
            )}
            {currentUser?.department === "Analyst" || currentUser?.department === "Digital Marketing" || currentUser?.department === "CEO" || currentUser?.role === "admin" ? (
              <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            ) : (
              <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700">
                {currentUser?.branch || "No branch"}
              </div>
            )}
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        <MonthlyTracker reports={marketingReports.filter(r => r.branch === (currentUser?.branch || selectedBranch))} />

        {/* Quick Branch Filters for Analyst, Digital Marketing, CEO & Admin */}
        {(currentUser?.department === "Analyst" || currentUser?.department === "Digital Marketing" || currentUser?.department === "CEO" || currentUser?.role === "admin") && (
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
          <KPICard title="Total Leads" value={totalLeads} icon={Target} trend={parseFloat(totalLeadsChange) >= 0 ? "up" : "down"} change={Math.abs(totalLeadsChange)} />
          <KPICard title="Call Leads" value={totalCallLeads} icon={Phone} trend={parseFloat(callLeadsChange) >= 0 ? "up" : "down"} change={Math.abs(callLeadsChange)} />
          <KPICard title="WhatsApp Leads" value={totalWhatsappLeads} icon={Target} trend={parseFloat(whatsappLeadsChange) >= 0 ? "up" : "down"} change={Math.abs(whatsappLeadsChange)} />
          <KPICard title="Form Leads" value={totalInstantFormLeads} icon={Target} trend={parseFloat(formLeadsChange) >= 0 ? "up" : "down"} change={Math.abs(formLeadsChange)} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TrendChart
            title="Daily Lead Generation by Source"
            data={trendData}
            lines={[
              { dataKey: "callLeads", name: "Call Leads" },
              { dataKey: "whatsappLeads", name: "WhatsApp Leads" },
              { dataKey: "instantFormLeads", name: "Form Leads" }
            ]}
          />
          {selectedBranch === "All Branches" && (
            <BranchComparisonChart
              title="Leads by Branch"
              data={branchData}
              dataKey="value"
              metric="Leads"
            />
          )}
        </div>

        {/* Reports Table */}
        <ReportTable
          title="Daily Lead Reports"
          data={tableData}
          columns={[
            { header: "Date", accessor: "date" },
            { header: "Branch", accessor: "branch" },
            { header: "Call Leads", accessor: "call" },
            { header: "WhatsApp Leads", accessor: "whatsapp" },
            { header: "Instant Forms", accessor: "instant" },
            { header: "Total Leads", accessor: "total" },
            { 
              header: "Notes", 
              accessor: "notes",
              render: (val) => val ? <span className="text-sm text-slate-600 truncate max-w-xs block">{val.substring(0, 30)}...</span> : "-"
            },
            { 
              header: "Action", 
              accessor: "id", 
              render: (_, row) => (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditDialog(row.report)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  {currentUser?.role === "admin" && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (confirm("Are you sure you want to delete this report?")) {
                        deleteMutation.mutate(row.id);
                      }
                    }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              )
            }
          ]}
        />

        {/* Edit Dialog */}
        {editDialog && (
          <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Marketing Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editDialog.report_date}
                      onChange={(e) => setEditDialog({ ...editDialog, report_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Call Leads</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.call_leads || 0}
                      onChange={(e) => setEditDialog({ ...editDialog, call_leads: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp Leads</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.whatsapp_leads || 0}
                      onChange={(e) => setEditDialog({ ...editDialog, whatsapp_leads: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Instant Form Leads</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.instant_form_leads || 0}
                      onChange={(e) => setEditDialog({ ...editDialog, instant_form_leads: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={editDialog.notes || ""}
                      onChange={(e) => setEditDialog({ ...editDialog, notes: e.target.value })}
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

        {/* Add Report Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Marketing Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newReport.report_date}
                  onChange={(e) => setNewReport({ ...newReport, report_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={newReport.branch} onValueChange={(val) => setNewReport({ ...newReport, branch: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map(branch => (
                      <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Call Leads</Label>
                <Input
                  type="number"
                  min="0"
                  value={newReport.call_leads}
                  onChange={(e) => setNewReport({ ...newReport, call_leads: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Leads</Label>
                <Input
                  type="number"
                  min="0"
                  value={newReport.whatsapp_leads}
                  onChange={(e) => setNewReport({ ...newReport, whatsapp_leads: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Instant Form Leads</Label>
                <Input
                  type="number"
                  min="0"
                  value={newReport.instant_form_leads}
                  onChange={(e) => setNewReport({ ...newReport, instant_form_leads: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={newReport.notes}
                  onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
                  placeholder="Add any notes or observations..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitReport} 
                  disabled={createReportMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  {createReportMutation.isPending ? "Adding..." : "Add Report"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}