import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval, startOfMonth } from "date-fns";
import { Users, DollarSign, TrendingUp, TrendingDown, Building2, Edit, Plus, Trash2, Target } from "lucide-react";
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
  const [projectionDialog, setProjectionDialog] = useState(false);
  const [editingProjections, setEditingProjections] = useState({});
  const [newReport, setNewReport] = useState({
    report_date: format(new Date(), "yyyy-MM-dd"),
    branch: "",
    center_manager: {
      number_of_patients: 0,
      revenue: 0,
      tracking_days: 30,
      operational_notes: ""
    }
  });

  const queryClient = useQueryClient();

  useEffect(() => {
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

  const { data: projections = [] } = useQuery({
    queryKey: ["monthlyProjections"],
    queryFn: () => base44.entities.MonthlyProjection.list()
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
          tracking_days: 30,
          operational_notes: ""
        }
      });
      toast.success("Report saved successfully");
    },
    onError: () => {
      toast.error("Failed to save report");
    }
  });

  const saveProjectionsMutation = useMutation({
    mutationFn: async (projectionsData) => {
      const promises = projectionsData.map(async (proj) => {
        const existing = projections.find(
          p => p.branch === proj.branch && p.month === proj.month
        );
        if (existing) {
          return base44.entities.MonthlyProjection.update(existing.id, proj);
        }
        return base44.entities.MonthlyProjection.create(proj);
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthlyProjections"] });
      setProjectionDialog(false);
      toast.success("Projections saved successfully");
    },
    onError: () => {
      toast.error("Failed to save projections");
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

  // Get current month projections
  const currentMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const currentProjections = projections.filter(p => p.month === currentMonth);

  // Calculate actual vs projected with tracking days
  const getProjection = (branch) => {
    return currentProjections.find(p => p.branch === branch);
  };

  // KPIs - calculate based on tracking days
  const calculateMetrics = () => {
    let totalPatients = 0;
    let totalRevenue = 0;
    let totalProjectedPatients = 0;
    let totalProjectedRevenue = 0;
    let totalDays = 0;

    filteredReports.forEach(r => {
      const days = r.center_manager?.tracking_days || 30;
      const projection = getProjection(r.branch);
      
      totalPatients += r.center_manager?.number_of_patients || 0;
      totalRevenue += r.center_manager?.revenue || 0;
      
      if (projection) {
        totalProjectedPatients += (projection.projected_patients / 30) * days;
        totalProjectedRevenue += (projection.projected_revenue / 30) * days;
      }
      totalDays += days;
    });

    return { totalPatients, totalRevenue, totalProjectedPatients, totalProjectedRevenue };
  };

  const { totalPatients, totalRevenue, totalProjectedPatients, totalProjectedRevenue } = calculateMetrics();

  const patientDeviation = totalProjectedPatients > 0 
    ? (((totalPatients - totalProjectedPatients) / totalProjectedPatients) * 100).toFixed(1) 
    : 0;
  const revenueDeviation = totalProjectedRevenue > 0 
    ? (((totalRevenue - totalProjectedRevenue) / totalProjectedRevenue) * 100).toFixed(1) 
    : 0;

  // Branch summaries
  const branchSummaries = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    const projection = getProjection(branch);
    
    // Calculate cumulative values from daily reports
    const cumulativePatients = data.reduce((sum, r) => sum + (r.center_manager?.number_of_patients || 0), 0);
    const cumulativeRevenue = data.reduce((sum, r) => sum + (r.center_manager?.revenue || 0), 0);
    
    // Get current day of the month
    const currentDay = new Date().getDate();
    const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    
    // Calculate expected values till today
    const expectedRevenueTillToday = projection 
      ? (projection.projected_revenue / totalDaysInMonth) * currentDay 
      : 0;
    const expectedPatientsTillToday = projection 
      ? (projection.projected_patients / totalDaysInMonth) * currentDay 
      : 0;
    
    // Calculate deviations
    const revenueDeviationValue = cumulativeRevenue - expectedRevenueTillToday;
    const revenueDeviationPercentage = expectedRevenueTillToday > 0 
      ? (revenueDeviationValue / expectedRevenueTillToday) * 100 
      : 0;
    
    const patientDeviationValue = cumulativePatients - expectedPatientsTillToday;
    const patientDeviationPercentage = expectedPatientsTillToday > 0 
      ? (patientDeviationValue / expectedPatientsTillToday) * 100 
      : 0;
    
    // Calculate remaining days and required daily metrics
    const remainingDays = totalDaysInMonth - currentDay;
    const requiredDailyRevenue = remainingDays > 0 && projection
      ? (projection.projected_revenue - cumulativeRevenue) / remainingDays
      : 0;
    const requiredDailyPatients = remainingDays > 0 && projection
      ? (projection.projected_patients - cumulativePatients) / remainingDays
      : 0;
    
    // Determine status
    let status = "good";
    if (revenueDeviationPercentage < -5 || patientDeviationPercentage < -5) {
      status = "behind";
    } else if (revenueDeviationPercentage >= 0 && patientDeviationPercentage >= 0) {
      status = "ahead";
    } else if (revenueDeviationPercentage >= -5 && patientDeviationPercentage >= -5) {
      status = "ontrack";
    }
    
    return {
      branch,
      cumulativePatients,
      cumulativeRevenue,
      expectedPatientsTillToday: expectedPatientsTillToday.toFixed(0),
      expectedRevenueTillToday: expectedRevenueTillToday.toFixed(0),
      patientDeviationValue: patientDeviationValue.toFixed(0),
      patientDeviationPercentage: patientDeviationPercentage.toFixed(1),
      revenueDeviationValue: revenueDeviationValue.toFixed(0),
      revenueDeviationPercentage: revenueDeviationPercentage.toFixed(1),
      remainingDays,
      requiredDailyRevenue: requiredDailyRevenue.toFixed(0),
      requiredDailyPatients: requiredDailyPatients.toFixed(1),
      status
    };
  });

  // Table data
  const tableData = filteredReports.map(r => {
    const days = r.center_manager?.tracking_days || 30;
    const projection = getProjection(r.branch);
    
    const projPatients = projection ? (projection.projected_patients / 30) * days : 0;
    const projRevenue = projection ? (projection.projected_revenue / 30) * days : 0;
    
    const patDev = projPatients > 0 
      ? (((r.center_manager?.number_of_patients || 0) - projPatients) / projPatients * 100).toFixed(1)
      : 0;
    const revDev = projRevenue > 0 
      ? (((r.center_manager?.revenue || 0) - projRevenue) / projRevenue * 100).toFixed(1)
      : 0;
    
    return {
      id: r.id,
      report: r,
      date: format(parseISO(r.report_date), "MMM d, yyyy"),
      branch: r.branch,
      patients: r.center_manager?.number_of_patients || 0,
      projectedPatients: projPatients.toFixed(0),
      patientDev: patDev,
      revenue: r.center_manager?.revenue || 0,
      projectedRevenue: projRevenue.toFixed(0),
      revenueDev: revDev,
      trackingDays: days,
      notes: r.center_manager?.operational_notes || ""
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleOpenProjectionDialog = () => {
    const initialProjections = {};
    BRANCHES.forEach(branch => {
      const existing = projections.find(p => p.branch === branch && p.month === currentMonth);
      initialProjections[branch] = {
        projected_patients: existing?.projected_patients || 0,
        projected_revenue: existing?.projected_revenue || 0,
      };
    });
    setEditingProjections(initialProjections);
    setProjectionDialog(true);
  };

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
            <Button onClick={handleOpenProjectionDialog} className="bg-emerald-600 hover:bg-emerald-700">
              <Target className="w-4 h-4 mr-2" />
              Set Monthly Projections
            </Button>
            <Button onClick={() => setAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Daily Report
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
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Branch Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {branchSummaries.filter(b => selectedBranch === "All Branches" || b.branch === selectedBranch).map(branch => (
                <Card key={branch.branch} className="border-0 shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {branch.branch}
                      </CardTitle>
                      <Badge variant="secondary" className={
                        branch.status === "ahead" ? "bg-emerald-50 text-emerald-700" : 
                        branch.status === "ontrack" ? "bg-blue-50 text-blue-700" : 
                        "bg-red-50 text-red-700"
                      }>
                        {branch.status === "ahead" ? "Ahead" : branch.status === "ontrack" ? "On Track" : "Behind"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <p className="text-sm text-slate-500">Cumulative Revenue</p>
                          <p className="text-lg font-semibold text-slate-900">₹{(branch.cumulativeRevenue / 1000).toFixed(1)}K</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Expected Revenue</p>
                          <p className="text-lg font-semibold text-slate-600">₹{(branch.expectedRevenueTillToday / 1000).toFixed(1)}K</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <p className="text-sm text-slate-500">Revenue Deviation</p>
                          <p className={`text-lg font-semibold ${parseFloat(branch.revenueDeviationPercentage) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ₹{(branch.revenueDeviationValue / 1000).toFixed(1)}K ({branch.revenueDeviationPercentage}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Required Daily</p>
                          <p className="text-lg font-semibold text-indigo-600">₹{(branch.requiredDailyRevenue / 1000).toFixed(1)}K/day</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <p className="text-sm text-slate-500">Cumulative Patients</p>
                          <p className="text-lg font-semibold text-slate-900">{branch.cumulativePatients}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Expected Patients</p>
                          <p className="text-lg font-semibold text-slate-600">{branch.expectedPatientsTillToday}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-slate-500">Patient Deviation</p>
                          <p className={`text-lg font-semibold ${parseFloat(branch.patientDeviationPercentage) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {branch.patientDeviationValue} ({branch.patientDeviationPercentage}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Required Daily</p>
                          <p className="text-lg font-semibold text-indigo-600">{branch.requiredDailyPatients}/day</p>
                        </div>
                      </div>
                      
                      <div className="pt-2 mt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500">Remaining Days: <span className="font-semibold text-slate-700">{branch.remainingDays}</span></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </div>

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

        {/* Monthly Projections Dialog */}
        {projectionDialog && (
          <Dialog open={projectionDialog} onOpenChange={setProjectionDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Set Monthly Projections - {format(new Date(), "MMMM yyyy")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-slate-600">Set projected patients and revenue for each branch for this month.</p>
                <div className="space-y-3">
                  {BRANCHES.map(branch => (
                    <Card key={branch} className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          {branch}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Projected Patients (Monthly)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={editingProjections[branch]?.projected_patients ?? ''}
                              onChange={(e) => setEditingProjections(prev => ({
                                ...prev,
                                [branch]: { ...prev[branch], projected_patients: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                              }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Projected Revenue (Monthly)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={editingProjections[branch]?.projected_revenue ?? ''}
                              onChange={(e) => setEditingProjections(prev => ({
                                ...prev,
                                [branch]: { ...prev[branch], projected_revenue: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                              }))}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setProjectionDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      const projectionsToSave = BRANCHES.map(branch => ({
                        branch,
                        month: currentMonth,
                        projected_patients: editingProjections[branch]?.projected_patients || 0,
                        projected_revenue: editingProjections[branch]?.projected_revenue || 0
                      }));
                      saveProjectionsMutation.mutate(projectionsToSave);
                    }}
                    disabled={saveProjectionsMutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {saveProjectionsMutation.isPending ? "Saving..." : "Save Projections"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

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
                        center_manager: { ...newReport.center_manager, number_of_patients: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
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
                        center_manager: { ...newReport.center_manager, revenue: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Number of Days</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={newReport.center_manager.tracking_days}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        center_manager: { ...newReport.center_manager, tracking_days: e.target.value === '' ? '' : parseInt(e.target.value) || 30 }
                      })}
                    />
                    <p className="text-xs text-slate-500">Used to calculate deviation against monthly projection</p>
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
                    onClick={() => {
                      const reportToSubmit = {
                        ...newReport,
                        center_manager: {
                          ...newReport.center_manager,
                          number_of_patients: parseInt(newReport.center_manager.number_of_patients) || 0,
                          revenue: parseInt(newReport.center_manager.revenue) || 0,
                          tracking_days: parseInt(newReport.center_manager.tracking_days) || 30
                        }
                      };
                      createMutation.mutate(reportToSubmit);
                    }}
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
                      value={editDialog.center_manager?.number_of_patients ?? ''}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        center_manager: { ...editDialog.center_manager, number_of_patients: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Revenue</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.center_manager?.revenue ?? ''}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        center_manager: { ...editDialog.center_manager, revenue: e.target.value === '' ? '' : parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Number of Days</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={editDialog.center_manager?.tracking_days ?? 30}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        center_manager: { ...editDialog.center_manager, tracking_days: e.target.value === '' ? '' : parseInt(e.target.value) || 30 }
                      })}
                    />
                    <p className="text-xs text-slate-500">Used to calculate deviation against monthly projection</p>
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
                    onClick={() => {
                      const reportToSubmit = {
                        ...editDialog,
                        center_manager: {
                          ...editDialog.center_manager,
                          number_of_patients: parseInt(editDialog.center_manager?.number_of_patients) || 0,
                          revenue: parseInt(editDialog.center_manager?.revenue) || 0,
                          tracking_days: parseInt(editDialog.center_manager?.tracking_days) || 30
                        }
                      };
                      updateMutation.mutate({ id: editDialog.id, data: reportToSubmit });
                    }}
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