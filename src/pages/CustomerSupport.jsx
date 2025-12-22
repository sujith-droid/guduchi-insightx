import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Phone, PhoneOutgoing, Calendar, Users, CheckCircle, Flame } from "lucide-react";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import TrendChart from "@/components/dashboard/TrendChart";
import BranchComparisonChart from "@/components/dashboard/BranchComparisonChart";
import ReportTable from "@/components/dashboard/ReportTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const totalAnsweredCalls = filteredReports.reduce((sum, r) => sum + (r.customer_support?.total_answered_calls || 0), 0);
  const totalAppointments = filteredReports.reduce((sum, r) => sum + (r.customer_support?.total_appointments || 0), 0);
  const totalOutboundCalls = filteredReports.reduce((sum, r) => sum + (r.customer_support?.total_outbound_calls || 0), 0);

  // Get all unique executives from all reports
  const allExecutives = new Set();
  filteredReports.forEach(r => {
    r.customer_support?.executive_data?.forEach(exec => {
      if (exec.executive_name) allExecutives.add(exec.executive_name);
    });
  });

  // Aggregate executive data
  const executiveAggregates = Array.from(allExecutives).map(execName => {
    const execData = {
      name: execName,
      appointments: 0,
      followups: 0,
      confirmed: 0,
      warm: 0
    };
    
    filteredReports.forEach(r => {
      const exec = r.customer_support?.executive_data?.find(e => e.executive_name === execName);
      if (exec) {
        execData.appointments += exec.appointment_count || 0;
        execData.followups += exec.followups || 0;
        execData.confirmed += exec.confirmed_appointments || 0;
        execData.warm += exec.warm_appointments || 0;
      }
    });
    
    return execData;
  });

  // Trend data
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredReports.filter(r => r.report_date === dateStr);
    trendData.push({
      date: format(currentDate, "MMM d"),
      answered: dayReports.reduce((sum, r) => sum + (r.customer_support?.total_answered_calls || 0), 0),
      appointments: dayReports.reduce((sum, r) => sum + (r.customer_support?.total_appointments || 0), 0),
      outbound: dayReports.reduce((sum, r) => sum + (r.customer_support?.total_outbound_calls || 0), 0)
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Branch comparison
  const branchData = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    return {
      branch,
      value: data.reduce((sum, r) => sum + (r.customer_support?.total_answered_calls || 0), 0)
    };
  });

  // Table data
  const tableData = filteredReports.map(r => ({
    date: format(parseISO(r.report_date), "MMM d, yyyy"),
    branch: r.branch,
    answered: r.customer_support?.total_answered_calls || 0,
    appointments: r.customer_support?.total_appointments || 0,
    outbound: r.customer_support?.total_outbound_calls || 0
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Customer Support</h1>
            <p className="text-sm text-slate-500 mt-1">Call handling & appointment management</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <KPICard title="Answered Calls" value={totalAnsweredCalls} icon={Phone} trend="up" change={5} />
          <KPICard title="Total Appointments" value={totalAppointments} icon={Calendar} trend="up" change={10} />
          <KPICard title="Outbound Calls" value={totalOutboundCalls} icon={PhoneOutgoing} trend="up" change={8} />
        </div>

        {/* Executive Performance */}
        {executiveAggregates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Executive Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {executiveAggregates.map(exec => (
                <Card key={exec.name} className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      {exec.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{exec.appointments}</p>
                        <p className="text-xs text-slate-500">Appointments</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-slate-900">{exec.followups}</p>
                        <p className="text-xs text-slate-500">Follow-ups</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-emerald-600">{exec.confirmed}</p>
                        <p className="text-xs text-slate-500">Confirmed</p>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-orange-600">{exec.warm}</p>
                        <p className="text-xs text-slate-500">Warm</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TrendChart
            title="Daily Activity Trend"
            data={trendData}
            lines={[
              { dataKey: "answered", name: "Answered Calls" },
              { dataKey: "appointments", name: "Appointments" },
              { dataKey: "outbound", name: "Outbound Calls" }
            ]}
          />
          {selectedBranch === "All Branches" && (
            <BranchComparisonChart
              title="Answered Calls by Branch"
              data={branchData}
              dataKey="value"
              metric="Calls"
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
            { header: "Answered Calls", accessor: "answered" },
            { header: "Appointments", accessor: "appointments" },
            { header: "Outbound Calls", accessor: "outbound" }
          ]}
        />
      </div>
    </div>
  );
}