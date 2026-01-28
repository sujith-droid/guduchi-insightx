import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isWithinInterval, subDays } from "date-fns";
import { Plus, Edit2, Trash2, DollarSign, Users, Package, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import KPICard from "@/components/dashboard/KPICard";
import TrendChart from "@/components/dashboard/TrendChart";
import ReportTable from "@/components/dashboard/ReportTable";
import MonthlyTracker from "@/components/dashboard/MonthlyTracker";

export default function OnlineConsultation() {
  const [currentUser, setCurrentUser] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 6),
    to: new Date()
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [newReport, setNewReport] = useState({
    report_date: format(new Date(), "yyyy-MM-dd"),
    revenue: 0,
    number_of_consultations: 0,
    one_month_trial_pack: 0,
    drp: 0
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["onlineConsultation"],
    queryFn: () => base44.entities.OnlineConsultation.list("-report_date", 500)
  });

  const createReportMutation = useMutation({
    mutationFn: (data) => base44.entities.OnlineConsultation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onlineConsultation"] });
      setShowAddDialog(false);
      setNewReport({
        report_date: format(new Date(), "yyyy-MM-dd"),
        revenue: 0,
        number_of_consultations: 0,
        one_month_trial_pack: 0,
        drp: 0
      });
      toast.success("Report added successfully");
    }
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnlineConsultation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onlineConsultation"] });
      setShowEditDialog(false);
      setEditingReport(null);
      toast.success("Report updated successfully");
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => base44.entities.OnlineConsultation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onlineConsultation"] });
      toast.success("Report deleted successfully");
    }
  });

  const filteredReports = reports.filter(report => {
    const reportDate = parseISO(report.report_date);
    return isWithinInterval(reportDate, { start: dateRange.from, end: dateRange.to });
  });

  // Calculate KPIs
  const totalRevenue = filteredReports.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const totalConsultations = filteredReports.reduce((sum, r) => sum + (r.number_of_consultations || 0), 0);
  const totalTrialPacks = filteredReports.reduce((sum, r) => sum + (r.one_month_trial_pack || 0), 0);
  const totalDRP = filteredReports.reduce((sum, r) => sum + (r.drp || 0), 0);
  const avgRevenuePerDay = filteredReports.length > 0 ? totalRevenue / filteredReports.length : 0;

  // Prepare trend data
  const trendData = filteredReports
    .sort((a, b) => new Date(a.report_date) - new Date(b.report_date))
    .map(r => ({
      date: format(parseISO(r.report_date), "MMM d"),
      Revenue: r.revenue || 0,
      Consultations: r.number_of_consultations || 0,
      "Trial Packs": r.one_month_trial_pack || 0,
      DRP: r.drp || 0
    }));

  // Table data
  const tableData = filteredReports.map(r => ({
    id: r.id,
    date: format(parseISO(r.report_date), "MMM d, yyyy"),
    revenue: r.revenue || 0,
    consultations: r.number_of_consultations || 0,
    trialPacks: r.one_month_trial_pack || 0,
    drp: r.drp || 0,
    actions: (
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditingReport(r);
            setShowEditDialog(true);
          }}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        {currentUser?.role === "admin" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteReportMutation.mutate(r.id)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        )}
      </div>
    )
  }));

  const handleAddReport = () => {
    createReportMutation.mutate(newReport);
  };

  const handleUpdateReport = () => {
    updateReportMutation.mutate({ id: editingReport.id, data: editingReport });
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Online Consultation</h1>
            <p className="text-sm text-slate-500 mt-1">Track daily online consultation metrics</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
            <Button onClick={() => setShowAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Report
            </Button>
          </div>
        </div>

        <MonthlyTracker reports={reports} />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <KPICard
            title="Total Revenue"
            value={`₹${totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            subtitle={`Avg ₹${Math.round(avgRevenuePerDay).toLocaleString()}/day`}
          />
          <KPICard
            title="Consultations"
            value={totalConsultations}
            icon={Users}
          />
          <KPICard
            title="Trial Packs"
            value={totalTrialPacks}
            icon={Package}
          />
          <KPICard
            title="DRP"
            value={totalDRP}
            icon={ShoppingCart}
          />
          <KPICard
            title="Total Conversions"
            value={totalTrialPacks + totalDRP}
            icon={ShoppingCart}
          />
        </div>

        {/* Trend Chart */}
        <div className="mb-8">
          <TrendChart
            title="Performance Trends"
            data={trendData}
            lines={[
              { key: "Revenue", name: "Revenue (₹)" },
              { key: "Consultations", name: "Consultations" },
              { key: "Trial Packs", name: "Trial Packs" },
              { key: "DRP", name: "DRP" }
            ]}
            height={300}
          />
        </div>

        {/* Report Table */}
        <ReportTable
          title="Daily Reports"
          data={tableData}
          columns={[
            { header: "Date", accessor: "date" },
            { header: "Revenue", accessor: "revenue", render: (val) => `₹${val.toLocaleString()}` },
            { header: "Consultations", accessor: "consultations" },
            { header: "Trial Packs", accessor: "trialPacks" },
            { header: "DRP", accessor: "drp" },
            { header: "Actions", accessor: "actions" }
          ]}
          emptyMessage="No reports found for this period"
        />

        {/* Add Report Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Daily Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Report Date</Label>
                <Input
                  type="date"
                  value={newReport.report_date}
                  onChange={(e) => setNewReport({ ...newReport, report_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Revenue (₹)</Label>
                <Input
                  type="number"
                  value={newReport.revenue}
                  onChange={(e) => setNewReport({ ...newReport, revenue: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Number of Consultations</Label>
                <Input
                  type="number"
                  value={newReport.number_of_consultations}
                  onChange={(e) => setNewReport({ ...newReport, number_of_consultations: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>One Month Trial Pack</Label>
                <Input
                  type="number"
                  value={newReport.one_month_trial_pack}
                  onChange={(e) => setNewReport({ ...newReport, one_month_trial_pack: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>DRP</Label>
                <Input
                  type="number"
                  value={newReport.drp}
                  onChange={(e) => setNewReport({ ...newReport, drp: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddReport} disabled={createReportMutation.isPending}>
                {createReportMutation.isPending ? "Adding..." : "Add Report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Report Dialog */}
        {editingReport && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Report Date</Label>
                  <Input
                    type="date"
                    value={editingReport.report_date}
                    onChange={(e) => setEditingReport({ ...editingReport, report_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Revenue (₹)</Label>
                  <Input
                    type="number"
                    value={editingReport.revenue}
                    onChange={(e) => setEditingReport({ ...editingReport, revenue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Number of Consultations</Label>
                  <Input
                    type="number"
                    value={editingReport.number_of_consultations}
                    onChange={(e) => setEditingReport({ ...editingReport, number_of_consultations: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>One Month Trial Pack</Label>
                  <Input
                    type="number"
                    value={editingReport.one_month_trial_pack}
                    onChange={(e) => setEditingReport({ ...editingReport, one_month_trial_pack: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>DRP</Label>
                  <Input
                    type="number"
                    value={editingReport.drp}
                    onChange={(e) => setEditingReport({ ...editingReport, drp: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button onClick={handleUpdateReport} disabled={updateReportMutation.isPending}>
                  {updateReportMutation.isPending ? "Updating..." : "Update Report"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}