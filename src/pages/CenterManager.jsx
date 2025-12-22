import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Users, DollarSign, TrendingUp, TrendingDown, Building2 } from "lucide-react";

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
            <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

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
            { header: "Days", accessor: "trackingDays" }
          ]}
        />
      </div>
    </div>
  );
}