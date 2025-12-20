import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Users, AlertCircle, CheckCircle, FileText, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import DepartmentCard from "@/components/dashboard/DepartmentCard";
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
  const [showAddDialog, setShowAddDialog] = useState(false);

  const queryClient = useQueryClient();

  const { data: branchReports = [], isLoading } = useQuery({
    queryKey: ["branchReports"],
    queryFn: () => base44.entities.BranchReport.list("-report_date", 500)
  });

  const filteredReports = branchReports.filter(report => {
    const reportDate = parseISO(report.report_date);
    const inRange = isWithinInterval(reportDate, { start: dateRange.from, end: dateRange.to });
    const matchesBranch = selectedBranch === "All Branches" || report.branch === selectedBranch;
    return inRange && matchesBranch;
  });

  // KPIs
  const totalStaffPresent = filteredReports.reduce((sum, r) => sum + (r.center_manager?.staff_present || 0), 0);
  const totalStaff = filteredReports.reduce((sum, r) => sum + (r.center_manager?.staff_total || 0), 0);
  const issuesRaised = filteredReports.reduce((sum, r) => sum + (r.center_manager?.issues_raised || 0), 0);
  const issuesResolved = filteredReports.reduce((sum, r) => sum + (r.center_manager?.issues_resolved || 0), 0);

  const attendanceRate = totalStaff > 0 ? ((totalStaffPresent / totalStaff) * 100).toFixed(1) : 0;
  const resolutionRate = issuesRaised > 0 ? ((issuesResolved / issuesRaised) * 100).toFixed(1) : 0;

  // Branch summaries
  const branchSummaries = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    const walkIns = data.reduce((sum, r) => sum + (r.reception?.walk_ins || 0), 0);
    const revenue = data.reduce((sum, r) => sum + (r.pharmacy?.revenue || 0), 0);
    const calls = data.reduce((sum, r) => sum + (r.customer_support?.incoming_calls || 0), 0);
    const issues = data.reduce((sum, r) => sum + (r.center_manager?.issues_raised || 0), 0);
    const resolved = data.reduce((sum, r) => sum + (r.center_manager?.issues_resolved || 0), 0);
    const staffPresent = data.reduce((sum, r) => sum + (r.center_manager?.staff_present || 0), 0);
    const staffTotal = data.reduce((sum, r) => sum + (r.center_manager?.staff_total || 0), 0);
    
    return {
      branch,
      walkIns,
      revenue,
      calls,
      issues,
      resolved,
      attendance: staffTotal > 0 ? ((staffPresent / staffTotal) * 100).toFixed(0) : 0,
      status: issues > resolved ? "warning" : "good"
    };
  });

  // Recent operational notes
  const recentNotes = filteredReports
    .filter(r => r.center_manager?.operational_notes)
    .map(r => ({
      date: format(parseISO(r.report_date), "MMM d"),
      branch: r.branch,
      note: r.center_manager.operational_notes
    }))
    .slice(0, 10);

  // Table data
  const tableData = filteredReports.map(r => ({
    date: format(parseISO(r.report_date), "MMM d, yyyy"),
    branch: r.branch,
    staffPresent: r.center_manager?.staff_present || 0,
    staffTotal: r.center_manager?.staff_total || 0,
    issuesRaised: r.center_manager?.issues_raised || 0,
    issuesResolved: r.center_manager?.issues_resolved || 0,
    notes: r.center_manager?.operational_notes || ""
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Center Manager</h1>
            <p className="text-sm text-slate-500 mt-1">Branch operations & staff management</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard title="Attendance Rate" value={`${attendanceRate}%`} icon={Users} trend={parseFloat(attendanceRate) > 90 ? "up" : "down"} />
          <KPICard title="Staff Present" value={totalStaffPresent} icon={Users} subtitle={`of ${totalStaff} total`} />
          <KPICard title="Issues Raised" value={issuesRaised} icon={AlertCircle} trend={issuesRaised > 10 ? "down" : "neutral"} />
          <KPICard title="Resolution Rate" value={`${resolutionRate}%`} icon={CheckCircle} trend={parseFloat(resolutionRate) > 80 ? "up" : "down"} />
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
                        {branch.status === "good" ? "On Track" : "Needs Attention"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{branch.walkIns}</p>
                        <p className="text-xs text-slate-500">Walk-ins</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-slate-900">₹{(branch.revenue / 1000).toFixed(1)}K</p>
                        <p className="text-xs text-slate-500">Revenue</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{branch.attendance}%</p>
                        <p className="text-xs text-slate-500">Attendance</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{branch.issues - branch.resolved}</p>
                        <p className="text-xs text-slate-500">Open Issues</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Operational Notes */}
        {recentNotes.length > 0 && (
          <Card className="border-0 shadow-sm mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Recent Operational Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentNotes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Badge variant="outline" className="shrink-0">{note.branch}</Badge>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{note.note}</p>
                      <p className="text-xs text-slate-400 mt-1">{note.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <ReportTable
          title="Daily Reports"
          data={tableData}
          columns={[
            { header: "Date", accessor: "date" },
            { header: "Branch", accessor: "branch" },
            { header: "Staff", accessor: "staffPresent", render: (val, row) => `${val}/${row.staffTotal}` },
            { header: "Issues", accessor: "issuesRaised" },
            { header: "Resolved", accessor: "issuesResolved" },
            { header: "Notes", accessor: "notes", render: (val) => (
              val ? <span className="text-sm text-slate-600 truncate max-w-xs block">{val.substring(0, 50)}...</span> : "-"
            )}
          ]}
        />
      </div>
    </div>
  );
}