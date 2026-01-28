import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { DollarSign, CreditCard, TrendingDown, Star, FileText, Edit, Plus, Trash2, UserCheck, Video } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import TrendChart from "@/components/dashboard/TrendChart";
import BranchComparisonChart from "@/components/dashboard/BranchComparisonChart";
import ReportTable from "@/components/dashboard/ReportTable";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];

export default function Pharmacy() {
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
    pharmacy: {
      cash: 0,
      paytm_swipe: 0,
      expenses: 0,
      drp_conversion: 0,
      trial_pack_conversion: 0,
      reasons_not_buying: "",
      patient_id_not_buying: "",
      google_reviews: 0,
      customer_testimonial_videos: 0
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
        pharmacy: {
          cash: 0,
          paytm_swipe: 0,
          expenses: 0,
          drp_conversion: 0,
          trial_pack_conversion: 0,
          reasons_not_buying: "",
          patient_id_not_buying: "",
          google_reviews: 0,
          customer_testimonial_videos: 0
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

  // KPIs - Calculate totals
  const totalCash = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.cash || 0), 0);
  const totalPaytmSwipe = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.paytm_swipe || 0), 0);
  const totalExpenses = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.expenses || 0), 0);
  const totalDrpConversion = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.drp_conversion || 0), 0);
  const totalTrialPackConversion = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.trial_pack_conversion || 0), 0);
  const totalGoogleReviews = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.google_reviews || 0), 0);
  const totalTestimonialVideos = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.customer_testimonial_videos || 0), 0);
  
  const totalSales = totalCash + totalPaytmSwipe;

  // Trend data
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredReports.filter(r => r.report_date === dateStr);
    const cash = dayReports.reduce((sum, r) => sum + (r.pharmacy?.cash || 0), 0);
    const paytmSwipe = dayReports.reduce((sum, r) => sum + (r.pharmacy?.paytm_swipe || 0), 0);
    const expenses = dayReports.reduce((sum, r) => sum + (r.pharmacy?.expenses || 0), 0);
    
    trendData.push({
      date: format(currentDate, "MMM d"),
      sales: (cash + paytmSwipe) / 1000,
      expenses: expenses / 1000
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Branch comparison
  const branchData = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    const cash = data.reduce((sum, r) => sum + (r.pharmacy?.cash || 0), 0);
    const paytmSwipe = data.reduce((sum, r) => sum + (r.pharmacy?.paytm_swipe || 0), 0);
    return {
      branch,
      value: cash + paytmSwipe
    };
  });

  // Table data
  const tableData = filteredReports.map(r => {
    const cash = r.pharmacy?.cash || 0;
    const paytmSwipe = r.pharmacy?.paytm_swipe || 0;
    const expenses = r.pharmacy?.expenses || 0;
    const sales = cash + paytmSwipe;
    
    return {
      id: r.id,
      report: r,
      date: format(parseISO(r.report_date), "MMM d, yyyy"),
      branch: r.branch,
      cash,
      paytmSwipe,
      expenses,
      totalSales: sales,
      drpConversion: r.pharmacy?.drp_conversion || 0,
      trialPackConversion: r.pharmacy?.trial_pack_conversion || 0,
      googleReviews: r.pharmacy?.google_reviews || 0,
      testimonialVideos: r.pharmacy?.customer_testimonial_videos || 0,
      reasonsNotBuying: r.pharmacy?.reasons_not_buying || ""
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Pharmacy</h1>
            <p className="text-sm text-slate-500 mt-1">Sales, expenses & customer feedback</p>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard title="Cash" value={`₹${(totalCash / 1000).toFixed(1)}K`} icon={DollarSign} trend="up" />
          <KPICard title="Paytm/Swipe" value={`₹${(totalPaytmSwipe / 1000).toFixed(1)}K`} icon={CreditCard} trend="up" />
          <KPICard title="Expenses" value={`₹${(totalExpenses / 1000).toFixed(1)}K`} icon={TrendingDown} />
          <KPICard 
            title="Total Sales" 
            value={`₹${(totalSales / 1000).toFixed(1)}K`} 
            icon={DollarSign} 
            trend="up" 
          />
        </div>

        {/* Conversions & Testimonials */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard title="DRP Conversions" value={totalDrpConversion} icon={UserCheck} trend="up" />
          <KPICard title="Trial Pack" value={totalTrialPackConversion} icon={UserCheck} trend="up" />
          <KPICard title="Google Reviews" value={totalGoogleReviews} icon={Star} trend="up" />
          <KPICard title="Testimonial Videos" value={totalTestimonialVideos} icon={Video} trend="up" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TrendChart
            title="Sales & Expenses Trend"
            data={trendData}
            lines={[
              { dataKey: "sales", name: "Sales (₹K)" },
              { dataKey: "expenses", name: "Expenses (₹K)" }
            ]}
          />
          {selectedBranch === "All Branches" && (
            <BranchComparisonChart
              title="Total Sales by Branch"
              data={branchData}
              dataKey="value"
              metric="Sales (₹)"
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
            { header: "Cash", accessor: "cash", render: (val) => `₹${val.toLocaleString()}` },
            { header: "Paytm/Swipe", accessor: "paytmSwipe", render: (val) => `₹${val.toLocaleString()}` },
            { header: "Total Sales", accessor: "totalSales", render: (val) => `₹${val.toLocaleString()}` },
            { header: "DRP", accessor: "drpConversion" },
            { header: "Trial Pack", accessor: "trialPackConversion" },
            { header: "Reviews", accessor: "googleReviews" },
            { header: "Videos", accessor: "testimonialVideos" },
            { 
              header: "Not Buying Reason", 
              accessor: "reasonsNotBuying", 
              render: (val) => (
                val ? <span className="text-sm text-slate-600 truncate max-w-xs block">{val.substring(0, 40)}...</span> : "-"
              )
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

        {/* Add Dialog */}
        {addDialog && (
          <Dialog open={addDialog} onOpenChange={setAddDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Pharmacy Report</DialogTitle>
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
                    <Label>Cash</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.pharmacy.cash}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        pharmacy: { ...newReport.pharmacy, cash: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Paytm/Swipe</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.pharmacy.paytm_swipe}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        pharmacy: { ...newReport.pharmacy, paytm_swipe: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expenses</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.pharmacy.expenses}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        pharmacy: { ...newReport.pharmacy, expenses: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DRP Conversion</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.pharmacy.drp_conversion}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        pharmacy: { ...newReport.pharmacy, drp_conversion: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trial Pack Conversion</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.pharmacy.trial_pack_conversion}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        pharmacy: { ...newReport.pharmacy, trial_pack_conversion: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Google Reviews</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.pharmacy.google_reviews}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        pharmacy: { ...newReport.pharmacy, google_reviews: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Testimonial Videos</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newReport.pharmacy.customer_testimonial_videos}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        pharmacy: { ...newReport.pharmacy, customer_testimonial_videos: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Patient ID (Not Buying)</Label>
                    <Input
                      value={newReport.pharmacy.patient_id_not_buying}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        pharmacy: { ...newReport.pharmacy, patient_id_not_buying: e.target.value }
                      })}
                      placeholder="Enter patient ID"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Reasons Not Buying</Label>
                    <Textarea
                      value={newReport.pharmacy.reasons_not_buying}
                      onChange={(e) => setNewReport({
                        ...newReport,
                        pharmacy: { ...newReport.pharmacy, reasons_not_buying: e.target.value }
                      })}
                      placeholder="Enter reasons..."
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
                <DialogTitle>Edit Pharmacy Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cash</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.pharmacy?.cash || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        pharmacy: { ...editDialog.pharmacy, cash: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Paytm/Swipe</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.pharmacy?.paytm_swipe || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        pharmacy: { ...editDialog.pharmacy, paytm_swipe: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expenses</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.pharmacy?.expenses || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        pharmacy: { ...editDialog.pharmacy, expenses: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DRP Conversion</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.pharmacy?.drp_conversion || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        pharmacy: { ...editDialog.pharmacy, drp_conversion: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trial Pack Conversion</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.pharmacy?.trial_pack_conversion || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        pharmacy: { ...editDialog.pharmacy, trial_pack_conversion: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Google Reviews</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.pharmacy?.google_reviews || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        pharmacy: { ...editDialog.pharmacy, google_reviews: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Testimonial Videos</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDialog.pharmacy?.customer_testimonial_videos || 0}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        pharmacy: { ...editDialog.pharmacy, customer_testimonial_videos: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Patient ID (Not Buying)</Label>
                    <Input
                      value={editDialog.pharmacy?.patient_id_not_buying || ""}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        pharmacy: { ...editDialog.pharmacy, patient_id_not_buying: e.target.value }
                      })}
                      placeholder="Enter patient ID"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Reasons Not Buying</Label>
                    <Textarea
                      value={editDialog.pharmacy?.reasons_not_buying || ""}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        pharmacy: { ...editDialog.pharmacy, reasons_not_buying: e.target.value }
                      })}
                      placeholder="Enter reasons..."
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