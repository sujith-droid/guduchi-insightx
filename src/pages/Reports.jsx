import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from "date-fns";
import { FileText, Download, Calendar, BarChart3, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import ReportTable from "@/components/dashboard/ReportTable";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];

export default function Reports() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 6),
    to: new Date()
  });
  const [reportType, setReportType] = useState("daily");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newReport, setNewReport] = useState({
    branch: "",
    report_date: format(new Date(), "yyyy-MM-dd"),
    reception: { walk_ins: 0, appointments: 0, conversions: 0, no_shows: 0, cancellations: 0 },
    customer_support: { incoming_calls: 0, missed_calls: 0, follow_ups_done: 0, pending_follow_ups: 0, resolved: 0, unresolved: 0 },
    pharmacy: { daily_orders: 0, revenue: 0, repeat_orders: 0, pending_dispatches: 0, stock_alerts: 0 },
    center_manager: { staff_present: 0, staff_total: 0, issues_raised: 0, issues_resolved: 0, operational_notes: "" }
  });

  const queryClient = useQueryClient();

  const { data: branchReports = [], isLoading } = useQuery({
    queryKey: ["branchReports"],
    queryFn: () => base44.entities.BranchReport.list("-report_date", 500)
  });

  const { data: marketingReports = [] } = useQuery({
    queryKey: ["marketingReports"],
    queryFn: () => base44.entities.MarketingReport.list("-report_date", 500)
  });

  const createReportMutation = useMutation({
    mutationFn: (data) => base44.entities.BranchReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branchReports"] });
      setShowAddDialog(false);
      toast.success("Report submitted successfully");
    }
  });

  const filteredReports = branchReports.filter(report => {
    const reportDate = parseISO(report.report_date);
    const inRange = isWithinInterval(reportDate, { start: dateRange.from, end: dateRange.to });
    const matchesBranch = selectedBranch === "All Branches" || report.branch === selectedBranch;
    return inRange && matchesBranch;
  });

  // Generate summary reports
  const generateSummary = (reports, mktReports) => {
    return {
      walkIns: reports.reduce((sum, r) => sum + (r.reception?.walk_ins || 0), 0),
      conversions: reports.reduce((sum, r) => sum + (r.reception?.conversions || 0), 0),
      calls: reports.reduce((sum, r) => sum + (r.customer_support?.incoming_calls || 0), 0),
      orders: reports.reduce((sum, r) => sum + (r.pharmacy?.daily_orders || 0), 0),
      revenue: reports.reduce((sum, r) => sum + (r.pharmacy?.revenue || 0), 0),
      leads: mktReports.reduce((sum, r) => sum + (r.leads_generated || 0), 0),
      spend: mktReports.reduce((sum, r) => sum + (r.spend || 0), 0),
      issues: reports.reduce((sum, r) => sum + (r.center_manager?.issues_raised || 0), 0)
    };
  };

  const currentSummary = generateSummary(
    filteredReports,
    marketingReports.filter(r => {
      const reportDate = parseISO(r.report_date);
      const inRange = isWithinInterval(reportDate, { start: dateRange.from, end: dateRange.to });
      const matchesBranch = selectedBranch === "All Branches" || r.branch === selectedBranch;
      return inRange && matchesBranch;
    })
  );

  // Pre-generated reports list
  const preGeneratedReports = [
    { name: "Daily Summary", type: "daily", date: format(new Date(), "MMM d, yyyy"), status: "ready" },
    { name: "Weekly Summary", type: "weekly", date: `Week of ${format(startOfWeek(new Date()), "MMM d")}`, status: "ready" },
    { name: "Monthly Summary", type: "monthly", date: format(new Date(), "MMMM yyyy"), status: "ready" }
  ];

  const handleSubmitReport = () => {
    if (!newReport.branch) {
      toast.error("Please select a branch");
      return;
    }
    createReportMutation.mutate(newReport);
  };

  const handleExport = (exportFormat) => {
    toast.success(`Exporting as ${exportFormat.toUpperCase()}...`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
            <p className="text-sm text-slate-500 mt-1">Generate and export reports</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Submit Daily Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Branch</Label>
                      <Select value={newReport.branch} onValueChange={(v) => setNewReport({ ...newReport, branch: v })}>
                        <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                        <SelectContent>
                          {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input type="date" value={newReport.report_date} onChange={(e) => setNewReport({ ...newReport, report_date: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Reception</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-xs">Walk-ins</Label><Input type="number" value={newReport.reception.walk_ins} onChange={(e) => setNewReport({ ...newReport, reception: { ...newReport.reception, walk_ins: parseInt(e.target.value) || 0 } })} /></div>
                      <div><Label className="text-xs">Appointments</Label><Input type="number" value={newReport.reception.appointments} onChange={(e) => setNewReport({ ...newReport, reception: { ...newReport.reception, appointments: parseInt(e.target.value) || 0 } })} /></div>
                      <div><Label className="text-xs">Conversions</Label><Input type="number" value={newReport.reception.conversions} onChange={(e) => setNewReport({ ...newReport, reception: { ...newReport.reception, conversions: parseInt(e.target.value) || 0 } })} /></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Customer Support</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-xs">Incoming Calls</Label><Input type="number" value={newReport.customer_support.incoming_calls} onChange={(e) => setNewReport({ ...newReport, customer_support: { ...newReport.customer_support, incoming_calls: parseInt(e.target.value) || 0 } })} /></div>
                      <div><Label className="text-xs">Missed Calls</Label><Input type="number" value={newReport.customer_support.missed_calls} onChange={(e) => setNewReport({ ...newReport, customer_support: { ...newReport.customer_support, missed_calls: parseInt(e.target.value) || 0 } })} /></div>
                      <div><Label className="text-xs">Resolved</Label><Input type="number" value={newReport.customer_support.resolved} onChange={(e) => setNewReport({ ...newReport, customer_support: { ...newReport.customer_support, resolved: parseInt(e.target.value) || 0 } })} /></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Pharmacy</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-xs">Orders</Label><Input type="number" value={newReport.pharmacy.daily_orders} onChange={(e) => setNewReport({ ...newReport, pharmacy: { ...newReport.pharmacy, daily_orders: parseInt(e.target.value) || 0 } })} /></div>
                      <div><Label className="text-xs">Revenue (₹)</Label><Input type="number" value={newReport.pharmacy.revenue} onChange={(e) => setNewReport({ ...newReport, pharmacy: { ...newReport.pharmacy, revenue: parseInt(e.target.value) || 0 } })} /></div>
                      <div><Label className="text-xs">Pending</Label><Input type="number" value={newReport.pharmacy.pending_dispatches} onChange={(e) => setNewReport({ ...newReport, pharmacy: { ...newReport.pharmacy, pending_dispatches: parseInt(e.target.value) || 0 } })} /></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Operations</h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div><Label className="text-xs">Staff Present</Label><Input type="number" value={newReport.center_manager.staff_present} onChange={(e) => setNewReport({ ...newReport, center_manager: { ...newReport.center_manager, staff_present: parseInt(e.target.value) || 0 } })} /></div>
                      <div><Label className="text-xs">Total Staff</Label><Input type="number" value={newReport.center_manager.staff_total} onChange={(e) => setNewReport({ ...newReport, center_manager: { ...newReport.center_manager, staff_total: parseInt(e.target.value) || 0 } })} /></div>
                    </div>
                    <div><Label className="text-xs">Notes</Label><Textarea value={newReport.center_manager.operational_notes} onChange={(e) => setNewReport({ ...newReport, center_manager: { ...newReport.center_manager, operational_notes: e.target.value } })} placeholder="Any operational notes..." /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button onClick={handleSubmitReport} disabled={createReportMutation.isPending}>
                    {createReportMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Period Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">{currentSummary.walkIns}</p>
                <p className="text-xs text-slate-500">Walk-ins</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">{currentSummary.conversions}</p>
                <p className="text-xs text-slate-500">Conversions</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">{currentSummary.calls}</p>
                <p className="text-xs text-slate-500">Calls</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">{currentSummary.orders}</p>
                <p className="text-xs text-slate-500">Orders</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">₹{(currentSummary.revenue / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Revenue</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">{currentSummary.leads}</p>
                <p className="text-xs text-slate-500">Leads</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">₹{(currentSummary.spend / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Ad Spend</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">{currentSummary.issues}</p>
                <p className="text-xs text-slate-500">Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pre-generated Reports */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Auto-generated Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {preGeneratedReports.map((report, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{report.name}</p>
                      <p className="text-xs text-slate-500">{report.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">Ready</Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleExport("excel")}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Reports Table */}
        <ReportTable
          title="All Branch Reports"
          data={filteredReports.map(r => ({
            date: format(parseISO(r.report_date), "MMM d, yyyy"),
            branch: r.branch,
            walkIns: r.reception?.walk_ins || 0,
            calls: r.customer_support?.incoming_calls || 0,
            orders: r.pharmacy?.daily_orders || 0,
            revenue: r.pharmacy?.revenue || 0,
            issues: r.center_manager?.issues_raised || 0
          })).sort((a, b) => new Date(b.date) - new Date(a.date))}
          columns={[
            { header: "Date", accessor: "date" },
            { header: "Branch", accessor: "branch" },
            { header: "Walk-ins", accessor: "walkIns" },
            { header: "Calls", accessor: "calls" },
            { header: "Orders", accessor: "orders" },
            { header: "Revenue", accessor: "revenue", render: (val) => `₹${val.toLocaleString()}` },
            { header: "Issues", accessor: "issues" }
          ]}
        />
      </div>
    </div>
  );
}