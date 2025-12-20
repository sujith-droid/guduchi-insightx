import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Package, DollarSign, RefreshCw, Truck, AlertTriangle } from "lucide-react";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import TrendChart from "@/components/dashboard/TrendChart";
import BranchComparisonChart from "@/components/dashboard/BranchComparisonChart";
import ReportTable from "@/components/dashboard/ReportTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];

export default function Pharmacy() {
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
  const totalOrders = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.daily_orders || 0), 0);
  const totalRevenue = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.revenue || 0), 0);
  const repeatOrders = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.repeat_orders || 0), 0);
  const pendingDispatches = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.pending_dispatches || 0), 0);
  const stockAlerts = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.stock_alerts || 0), 0);

  const repeatRate = totalOrders > 0 ? ((repeatOrders / totalOrders) * 100).toFixed(1) : 0;
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0;

  // Trend data
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredReports.filter(r => r.report_date === dateStr);
    trendData.push({
      date: format(currentDate, "MMM d"),
      orders: dayReports.reduce((sum, r) => sum + (r.pharmacy?.daily_orders || 0), 0),
      revenue: dayReports.reduce((sum, r) => sum + (r.pharmacy?.revenue || 0), 0) / 1000
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Branch comparison
  const branchData = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    return {
      branch,
      value: data.reduce((sum, r) => sum + (r.pharmacy?.revenue || 0), 0)
    };
  });

  // Stock alerts by branch
  const alertsByBranch = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    return {
      branch,
      alerts: data.reduce((sum, r) => sum + (r.pharmacy?.stock_alerts || 0), 0)
    };
  }).filter(b => b.alerts > 0);

  // Table data
  const tableData = filteredReports.map(r => ({
    date: format(parseISO(r.report_date), "MMM d, yyyy"),
    branch: r.branch,
    orders: r.pharmacy?.daily_orders || 0,
    revenue: r.pharmacy?.revenue || 0,
    repeat: r.pharmacy?.repeat_orders || 0,
    pending: r.pharmacy?.pending_dispatches || 0,
    alerts: r.pharmacy?.stock_alerts || 0
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Pharmacy</h1>
            <p className="text-sm text-slate-500 mt-1">Orders, revenue & inventory</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KPICard title="Total Orders" value={totalOrders} icon={Package} trend="up" change={12} />
          <KPICard title="Revenue" value={`₹${(totalRevenue / 1000).toFixed(1)}K`} icon={DollarSign} trend="up" change={18} />
          <KPICard title="Repeat Orders" value={repeatOrders} icon={RefreshCw} trend="up" subtitle={`${repeatRate}% rate`} />
          <KPICard title="Pending Dispatch" value={pendingDispatches} icon={Truck} trend={pendingDispatches > 10 ? "down" : "neutral"} />
          <KPICard title="Stock Alerts" value={stockAlerts} icon={AlertTriangle} trend={stockAlerts > 0 ? "down" : "up"} />
        </div>

        {/* Stock Alerts Warning */}
        {stockAlerts > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {alertsByBranch.map(b => (
                  <Badge key={b.branch} variant="outline" className="border-amber-300 text-amber-700">
                    {b.branch}: {b.alerts} alert{b.alerts > 1 ? 's' : ''}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TrendChart
            title="Orders & Revenue Trend"
            data={trendData}
            lines={[
              { dataKey: "orders", name: "Orders" },
              { dataKey: "revenue", name: "Revenue (₹K)" }
            ]}
          />
          {selectedBranch === "All Branches" && (
            <BranchComparisonChart
              title="Revenue by Branch"
              data={branchData}
              dataKey="value"
              metric="Revenue (₹)"
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
            { header: "Orders", accessor: "orders" },
            { header: "Revenue", accessor: "revenue", render: (val) => `₹${val.toLocaleString()}` },
            { header: "Repeat", accessor: "repeat" },
            { header: "Pending", accessor: "pending" },
            { header: "Alerts", accessor: "alerts", render: (val) => (
              val > 0 ? (
                <Badge variant="secondary" className="bg-red-50 text-red-700">{val}</Badge>
              ) : <span className="text-slate-400">0</span>
            )}
          ]}
        />
      </div>
    </div>
  );
}