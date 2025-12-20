import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Phone, PhoneMissed, CheckCircle, Clock, BarChart3 } from "lucide-react";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import TrendChart from "@/components/dashboard/TrendChart";
import BranchComparisonChart from "@/components/dashboard/BranchComparisonChart";
import ReportTable from "@/components/dashboard/ReportTable";
import { Badge } from "@/components/ui/badge";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];

export default function CustomerSupport() {
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
  const totalCalls = filteredReports.reduce((sum, r) => sum + (r.customer_support?.incoming_calls || 0), 0);
  const missedCalls = filteredReports.reduce((sum, r) => sum + (r.customer_support?.missed_calls || 0), 0);
  const followUpsDone = filteredReports.reduce((sum, r) => sum + (r.customer_support?.follow_ups_done || 0), 0);
  const pendingFollowUps = filteredReports.reduce((sum, r) => sum + (r.customer_support?.pending_follow_ups || 0), 0);
  const resolved = filteredReports.reduce((sum, r) => sum + (r.customer_support?.resolved || 0), 0);

  const callAnswerRate = totalCalls > 0 ? (((totalCalls - missedCalls) / totalCalls) * 100).toFixed(1) : 0;
  const resolutionRate = (resolved + pendingFollowUps) > 0 ? ((resolved / (resolved + pendingFollowUps)) * 100).toFixed(1) : 0;

  // Trend data
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredReports.filter(r => r.report_date === dateStr);
    trendData.push({
      date: format(currentDate, "MMM d"),
      calls: dayReports.reduce((sum, r) => sum + (r.customer_support?.incoming_calls || 0), 0),
      missed: dayReports.reduce((sum, r) => sum + (r.customer_support?.missed_calls || 0), 0),
      resolved: dayReports.reduce((sum, r) => sum + (r.customer_support?.resolved || 0), 0)
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Branch comparison
  const branchData = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    const calls = data.reduce((sum, r) => sum + (r.customer_support?.incoming_calls || 0), 0);
    const missed = data.reduce((sum, r) => sum + (r.customer_support?.missed_calls || 0), 0);
    return {
      branch,
      value: calls > 0 ? (((calls - missed) / calls) * 100).toFixed(0) : 0
    };
  });

  // Table data
  const tableData = filteredReports.map(r => ({
    date: format(parseISO(r.report_date), "MMM d, yyyy"),
    branch: r.branch,
    calls: r.customer_support?.incoming_calls || 0,
    missed: r.customer_support?.missed_calls || 0,
    followUps: r.customer_support?.follow_ups_done || 0,
    pending: r.customer_support?.pending_follow_ups || 0,
    resolved: r.customer_support?.resolved || 0,
    unresolved: r.customer_support?.unresolved || 0
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Customer Support</h1>
            <p className="text-sm text-slate-500 mt-1">Calls, follow-ups & resolution tracking</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KPICard title="Total Calls" value={totalCalls} icon={Phone} trend="up" change={5} />
          <KPICard title="Missed Calls" value={missedCalls} icon={PhoneMissed} trend={missedCalls > totalCalls * 0.1 ? "down" : "up"} />
          <KPICard title="Call Answer Rate" value={`${callAnswerRate}%`} icon={BarChart3} trend="up" />
          <KPICard title="Follow-ups Done" value={followUpsDone} icon={CheckCircle} trend="up" change={10} />
          <KPICard title="Pending" value={pendingFollowUps} icon={Clock} trend={pendingFollowUps > 10 ? "down" : "neutral"} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TrendChart
            title="Call Volume Trend"
            data={trendData}
            lines={[
              { dataKey: "calls", name: "Total Calls" },
              { dataKey: "missed", name: "Missed Calls" },
              { dataKey: "resolved", name: "Resolved" }
            ]}
          />
          {selectedBranch === "All Branches" && (
            <BranchComparisonChart
              title="Answer Rate by Branch (%)"
              data={branchData}
              dataKey="value"
              metric="Answer Rate %"
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
            { header: "Incoming", accessor: "calls" },
            { header: "Missed", accessor: "missed" },
            { header: "Follow-ups", accessor: "followUps" },
            { header: "Pending", accessor: "pending", render: (val) => (
              <Badge variant="secondary" className={val > 5 ? "bg-amber-50 text-amber-700" : "bg-slate-100"}>
                {val}
              </Badge>
            )},
            { header: "Resolved", accessor: "resolved" }
          ]}
        />
      </div>
    </div>
  );
}