import { useState, useEffect } from "react";
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
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 6),
    to: new Date()
  });
  const [reportType, setReportType] = useState("daily");
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      // Auto-select branch for Center Managers
      if (user.department === "Center Manager" && user.branch) {
        setSelectedBranch(user.branch);
      }
    }).catch(() => {});
  }, []);
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
      conversions: reports.reduce((sum, r) => sum + ((r.reception?.drp_conversion || 0) + (r.reception?.trial_pack_conversion || 0)), 0),
      calls: reports.reduce((sum, r) => sum + (r.customer_support?.total_answered_calls || 0), 0),
      patients: reports.reduce((sum, r) => sum + (r.center_manager?.number_of_patients || 0), 0),
      revenue: reports.reduce((sum, r) => sum + ((r.pharmacy?.cash || 0) + (r.pharmacy?.paytm_swipe || 0)), 0),
      leads: mktReports.reduce((sum, r) => sum + ((r.call_leads || 0) + (r.whatsapp_leads || 0) + (r.instant_form_leads || 0)), 0),
      pharmacySales: reports.reduce((sum, r) => sum + ((r.pharmacy?.cash || 0) + (r.pharmacy?.paytm_swipe || 0)), 0),
      googleReviews: reports.reduce((sum, r) => sum + (r.pharmacy?.google_reviews || 0), 0)
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

  const convertToCSV = (data, headers) => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExport = (reportType) => {
    try {
      const branchName = selectedBranch === "All Branches" ? "All" : selectedBranch;
      const dateStr = format(new Date(), "yyyy-MM-dd");
      
      // Reception Data
      const receptionData = filteredReports.map(r => ({
        Date: r.report_date,
        Branch: r.branch,
        Consultations: r.reception?.walk_ins || 0,
        Appointments: r.reception?.appointments || 0,
        DRP: r.reception?.drp_conversion || 0,
        TrialPack: r.reception?.trial_pack_conversion || 0,
        NoShows: r.reception?.no_shows || 0,
        Cancellations: r.reception?.cancellations || 0,
        YouTubeQR: r.reception?.youtube_qr_scans || 0,
        InstagramQR: r.reception?.instagram_qr_scans || 0,
        FacebookQR: r.reception?.facebook_qr_scans || 0
      }));
      
      // Customer Support Data
      const supportData = filteredReports.map(r => ({
        Date: r.report_date,
        Branch: r.branch,
        AnsweredCalls: r.customer_support?.total_answered_calls || 0,
        Appointments: r.customer_support?.total_appointments || 0,
        OutboundCalls: r.customer_support?.total_outbound_calls || 0
      }));
      
      // Pharmacy Data
      const pharmacyData = filteredReports.map(r => ({
        Date: r.report_date,
        Branch: r.branch,
        Cash: r.pharmacy?.cash || 0,
        PaytmSwipe: r.pharmacy?.paytm_swipe || 0,
        Expenses: r.pharmacy?.expenses || 0,
        TotalSales: (r.pharmacy?.cash || 0) + (r.pharmacy?.paytm_swipe || 0),
        GoogleReviews: r.pharmacy?.google_reviews || 0,
        PatientIDNotBuying: r.pharmacy?.patient_id_not_buying || "",
        ReasonsNotBuying: r.pharmacy?.reasons_not_buying || ""
      }));
      
      // Center Manager Data
      const centerData = filteredReports.map(r => ({
        Date: r.report_date,
        Branch: r.branch,
        Patients: r.center_manager?.number_of_patients || 0,
        Revenue: r.center_manager?.revenue || 0,
        ProjectedPatients: r.center_manager?.projected_patients || 0,
        ProjectedRevenue: r.center_manager?.projected_revenue || 0,
        Notes: r.center_manager?.operational_notes || ""
      }));

      // Combine all data into one CSV with section headers
      let fullCSV = "RECEPTION DATA\n";
      fullCSV += convertToCSV(receptionData, ['Date', 'Branch', 'Consultations', 'Appointments', 'DRP', 'TrialPack', 'NoShows', 'Cancellations', 'YouTubeQR', 'InstagramQR', 'FacebookQR']);
      
      fullCSV += "\n\nCUSTOMER SUPPORT DATA\n";
      fullCSV += convertToCSV(supportData, ['Date', 'Branch', 'AnsweredCalls', 'Appointments', 'OutboundCalls']);
      
      fullCSV += "\n\nPHARMACY DATA\n";
      fullCSV += convertToCSV(pharmacyData, ['Date', 'Branch', 'Cash', 'PaytmSwipe', 'Expenses', 'TotalSales', 'GoogleReviews', 'PatientIDNotBuying', 'ReasonsNotBuying']);
      
      fullCSV += "\n\nCENTER MANAGER DATA\n";
      fullCSV += convertToCSV(centerData, ['Date', 'Branch', 'Patients', 'Revenue', 'ProjectedPatients', 'ProjectedRevenue', 'Notes']);

      const filename = `${branchName}_${reportType}_${dateStr}.csv`;
      downloadCSV(fullCSV, filename);
      
      toast.success("Report exported successfully");
    } catch (error) {
      toast.error("Failed to export report");
      console.error(error);
    }
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
            <BranchSelector value={selectedBranch} onChange={setSelectedBranch} user={currentUser} />
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
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
                <p className="text-xs text-slate-500">Answered Calls</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">{currentSummary.patients}</p>
                <p className="text-xs text-slate-500">Patients</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">₹{(currentSummary.revenue / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Revenue</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">{currentSummary.leads}</p>
                <p className="text-xs text-slate-500">Marketing Leads</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">₹{(currentSummary.pharmacySales / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Pharmacy Sales</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-semibold text-slate-900">{currentSummary.googleReviews}</p>
                <p className="text-xs text-slate-500">Reviews</p>
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
                    <Button variant="ghost" size="icon" onClick={() => handleExport(report.type)}>
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
            conversions: (r.reception?.drp_conversion || 0) + (r.reception?.trial_pack_conversion || 0),
            calls: r.customer_support?.total_answered_calls || 0,
            patients: r.center_manager?.number_of_patients || 0,
            revenue: (r.pharmacy?.cash || 0) + (r.pharmacy?.paytm_swipe || 0),
            pharmacySales: (r.pharmacy?.cash || 0) + (r.pharmacy?.paytm_swipe || 0)
          })).sort((a, b) => new Date(b.date) - new Date(a.date))}
          columns={[
            { header: "Date", accessor: "date" },
            { header: "Branch", accessor: "branch" },
            { header: "Walk-ins", accessor: "walkIns" },
            { header: "Conversions", accessor: "conversions" },
            { header: "Calls", accessor: "calls" },
            { header: "Patients", accessor: "patients" },
            { header: "Revenue", accessor: "revenue", render: (val) => `₹${val.toLocaleString()}` },
            { header: "Pharmacy", accessor: "pharmacySales", render: (val) => `₹${val.toLocaleString()}` }
          ]}
        />
      </div>
    </div>
  );
}