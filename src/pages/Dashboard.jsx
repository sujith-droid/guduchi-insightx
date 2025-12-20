import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Users, Phone, Package, ClipboardList, TrendingUp, Target, DollarSign, AlertTriangle } from "lucide-react";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import BranchComparisonChart from "@/components/dashboard/BranchComparisonChart";
import DepartmentCard from "@/components/dashboard/DepartmentCard";
import TrendChart from "@/components/dashboard/TrendChart";
import MarketingSourceChart from "@/components/dashboard/MarketingSourceChart";
import ExportButton from "@/components/dashboard/ExportButton";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];

export default function Dashboard() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 6),
    to: new Date()
  });

  const { data: branchReports = [], isLoading: loadingBranch } = useQuery({
    queryKey: ["branchReports"],
    queryFn: () => base44.entities.BranchReport.list("-report_date", 500)
  });

  const { data: marketingReports = [], isLoading: loadingMarketing } = useQuery({
    queryKey: ["marketingReports"],
    queryFn: () => base44.entities.MarketingReport.list("-report_date", 500)
  });

  // Filter data based on date range and branch
  const filteredBranchReports = branchReports.filter(report => {
    const reportDate = parseISO(report.report_date);
    const inRange = isWithinInterval(reportDate, { start: dateRange.from, end: dateRange.to });
    const matchesBranch = selectedBranch === "All Branches" || report.branch === selectedBranch;
    return inRange && matchesBranch;
  });

  const filteredMarketingReports = marketingReports.filter(report => {
    const reportDate = parseISO(report.report_date);
    const inRange = isWithinInterval(reportDate, { start: dateRange.from, end: dateRange.to });
    const matchesBranch = selectedBranch === "All Branches" || report.branch === selectedBranch;
    return inRange && matchesBranch;
  });

  // Calculate KPIs
  const totalWalkIns = filteredBranchReports.reduce((sum, r) => sum + (r.reception?.walk_ins || 0), 0);
  const totalConversions = filteredBranchReports.reduce((sum, r) => sum + (r.reception?.conversions || 0), 0);
  const totalCalls = filteredBranchReports.reduce((sum, r) => sum + (r.customer_support?.incoming_calls || 0), 0);
  const totalRevenue = filteredBranchReports.reduce((sum, r) => sum + (r.pharmacy?.revenue || 0), 0);
  const totalLeads = filteredMarketingReports.reduce((sum, r) => sum + (r.leads_generated || 0), 0);
  const totalSpend = filteredMarketingReports.reduce((sum, r) => sum + (r.spend || 0), 0);

  const conversionRate = totalWalkIns > 0 ? ((totalConversions / totalWalkIns) * 100).toFixed(1) : 0;
  const costPerLead = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : 0;

  // Branch comparison data
  const branchComparisonData = BRANCHES.map(branch => {
    const branchData = filteredBranchReports.filter(r => r.branch === branch);
    return {
      branch,
      walkIns: branchData.reduce((sum, r) => sum + (r.reception?.walk_ins || 0), 0),
      revenue: branchData.reduce((sum, r) => sum + (r.pharmacy?.revenue || 0), 0),
      conversions: branchData.reduce((sum, r) => sum + (r.reception?.conversions || 0), 0)
    };
  });

  // Marketing source data
  const sourceData = ["Meta", "Google", "WhatsApp", "Organic", "Referral", "Other"].map(source => ({
    source,
    value: filteredMarketingReports.filter(r => r.source === source).reduce((sum, r) => sum + (r.leads_generated || 0), 0)
  })).filter(s => s.value > 0);

  // Trend data for chart
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredBranchReports.filter(r => r.report_date === dateStr);
    const dayMarketing = filteredMarketingReports.filter(r => r.report_date === dateStr);
    trendData.push({
      date: format(currentDate, "MMM d"),
      walkIns: dayReports.reduce((sum, r) => sum + (r.reception?.walk_ins || 0), 0),
      leads: dayMarketing.reduce((sum, r) => sum + (r.leads_generated || 0), 0),
      revenue: dayReports.reduce((sum, r) => sum + (r.pharmacy?.revenue || 0), 0)
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Aggregated department data
  const receptionData = {
    walkIns: totalWalkIns,
    appointments: filteredBranchReports.reduce((sum, r) => sum + (r.reception?.appointments || 0), 0),
    noShows: filteredBranchReports.reduce((sum, r) => sum + (r.reception?.no_shows || 0), 0),
    cancellations: filteredBranchReports.reduce((sum, r) => sum + (r.reception?.cancellations || 0), 0)
  };

  const supportData = {
    calls: totalCalls,
    missed: filteredBranchReports.reduce((sum, r) => sum + (r.customer_support?.missed_calls || 0), 0),
    resolved: filteredBranchReports.reduce((sum, r) => sum + (r.customer_support?.resolved || 0), 0),
    pending: filteredBranchReports.reduce((sum, r) => sum + (r.customer_support?.pending_follow_ups || 0), 0)
  };

  const pharmacyData = {
    orders: filteredBranchReports.reduce((sum, r) => sum + (r.pharmacy?.daily_orders || 0), 0),
    revenue: totalRevenue,
    pending: filteredBranchReports.reduce((sum, r) => sum + (r.pharmacy?.pending_dispatches || 0), 0),
    alerts: filteredBranchReports.reduce((sum, r) => sum + (r.pharmacy?.stock_alerts || 0), 0)
  };

  const isLoading = loadingBranch || loadingMarketing;

  const handleExport = (exportFormat) => {
    // Export functionality placeholder
    console.log(`Exporting as ${exportFormat}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              {selectedBranch === "All Branches" ? "Organization Overview" : `${selectedBranch} Branch`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
            <ExportButton onExport={handleExport} />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Total Walk-ins"
            value={totalWalkIns.toLocaleString()}
            icon={Users}
            trend={totalWalkIns > 0 ? "up" : "neutral"}
            change={12}
          />
          <KPICard
            title="Conversion Rate"
            value={`${conversionRate}%`}
            icon={Target}
            trend={parseFloat(conversionRate) > 30 ? "up" : "down"}
            change={5}
          />
          <KPICard
            title="Total Revenue"
            value={`₹${(totalRevenue / 1000).toFixed(1)}K`}
            icon={DollarSign}
            trend="up"
            change={18}
          />
          <KPICard
            title="Cost per Lead"
            value={`₹${costPerLead}`}
            icon={TrendingUp}
            trend={parseFloat(costPerLead) < 100 ? "up" : "down"}
            subtitle={`${totalLeads} leads generated`}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <TrendChart
              title="Performance Trend"
              data={trendData}
              lines={[
                { dataKey: "walkIns", name: "Walk-ins" },
                { dataKey: "leads", name: "Leads" }
              ]}
            />
          </div>
          <MarketingSourceChart data={sourceData} />
        </div>

        {/* Branch Comparison */}
        {selectedBranch === "All Branches" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <BranchComparisonChart
              title="Walk-ins by Branch"
              data={branchComparisonData}
              dataKey="walkIns"
              metric="Walk-ins"
            />
            <BranchComparisonChart
              title="Revenue by Branch"
              data={branchComparisonData}
              dataKey="revenue"
              metric="Revenue (₹)"
            />
          </div>
        )}

        {/* Department Cards */}
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Department Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DepartmentCard
            title="Reception"
            icon={Users}
            color="indigo"
            status={receptionData.noShows < receptionData.walkIns * 0.1 ? "good" : "warning"}
            metrics={[
              { label: "Walk-ins", value: receptionData.walkIns },
              { label: "Appointments", value: receptionData.appointments },
              { label: "No-shows", value: receptionData.noShows },
              { label: "Cancellations", value: receptionData.cancellations }
            ]}
          />
          <DepartmentCard
            title="Customer Support"
            icon={Phone}
            color="emerald"
            status={supportData.missed < supportData.calls * 0.15 ? "good" : "warning"}
            metrics={[
              { label: "Total Calls", value: supportData.calls },
              { label: "Missed Calls", value: supportData.missed },
              { label: "Resolved", value: supportData.resolved },
              { label: "Pending", value: supportData.pending }
            ]}
          />
          <DepartmentCard
            title="Pharmacy"
            icon={Package}
            color="amber"
            status={pharmacyData.alerts === 0 ? "good" : pharmacyData.alerts < 5 ? "warning" : "critical"}
            metrics={[
              { label: "Orders", value: pharmacyData.orders },
              { label: "Revenue", value: `₹${(pharmacyData.revenue / 1000).toFixed(1)}K` },
              { label: "Pending", value: pharmacyData.pending },
              { label: "Stock Alerts", value: pharmacyData.alerts }
            ]}
          />
          <DepartmentCard
            title="Operations"
            icon={ClipboardList}
            color="violet"
            status="good"
            metrics={[
              { label: "Staff Present", value: filteredBranchReports.reduce((sum, r) => sum + (r.center_manager?.staff_present || 0), 0) },
              { label: "Total Staff", value: filteredBranchReports.reduce((sum, r) => sum + (r.center_manager?.staff_total || 0), 0) },
              { label: "Issues Raised", value: filteredBranchReports.reduce((sum, r) => sum + (r.center_manager?.issues_raised || 0), 0) },
              { label: "Issues Resolved", value: filteredBranchReports.reduce((sum, r) => sum + (r.center_manager?.issues_resolved || 0), 0) }
            ]}
          />
        </div>
      </div>
    </div>
  );
}