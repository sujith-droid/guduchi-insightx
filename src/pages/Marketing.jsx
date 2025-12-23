import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Target, TrendingUp } from "lucide-react";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import TrendChart from "@/components/dashboard/TrendChart";
import BranchComparisonChart from "@/components/dashboard/BranchComparisonChart";
import ReportTable from "@/components/dashboard/ReportTable";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];

export default function Marketing() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 6),
    to: new Date()
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      // Digital Marketing and Analyst can see all branches
      if (user.department !== "Analyst" && user.department !== "Digital Marketing" && user.branch) {
        setSelectedBranch(user.branch);
      }
    }).catch(() => {});
  }, []);

  const { data: marketingReports = [], isLoading } = useQuery({
    queryKey: ["marketingReports"],
    queryFn: () => base44.entities.MarketingReport.list("-report_date", 500)
  });

  const filteredReports = marketingReports.filter(report => {
    const reportDate = parseISO(report.report_date);
    const inRange = isWithinInterval(reportDate, { start: dateRange.from, end: dateRange.to });
    const matchesBranch = selectedBranch === "All Branches" || report.branch === selectedBranch;
    return inRange && matchesBranch;
  });

  // KPIs
  const totalCallLeads = filteredReports.reduce((sum, r) => sum + (r.call_leads || 0), 0);
  const totalWhatsappLeads = filteredReports.reduce((sum, r) => sum + (r.whatsapp_leads || 0), 0);
  const totalInstantFormLeads = filteredReports.reduce((sum, r) => sum + (r.instant_form_leads || 0), 0);
  const totalLeads = totalCallLeads + totalWhatsappLeads + totalInstantFormLeads;
  const avgLeadsPerDay = filteredReports.length > 0 ? (totalLeads / filteredReports.length).toFixed(1) : 0;

  // Trend data
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredReports.filter(r => r.report_date === dateStr);
    trendData.push({
      date: format(currentDate, "MMM d"),
      callLeads: dayReports.reduce((sum, r) => sum + (r.call_leads || 0), 0),
      whatsappLeads: dayReports.reduce((sum, r) => sum + (r.whatsapp_leads || 0), 0),
      instantFormLeads: dayReports.reduce((sum, r) => sum + (r.instant_form_leads || 0), 0)
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Branch comparison
  const branchData = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    return {
      branch,
      value: data.reduce((sum, r) => sum + (r.call_leads || 0) + (r.whatsapp_leads || 0) + (r.instant_form_leads || 0), 0)
    };
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Digital Marketing</h1>
            <p className="text-sm text-slate-500 mt-1">Daily lead tracking</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {currentUser?.department === "Analyst" || currentUser?.department === "Digital Marketing" ? (
              <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            ) : (
              <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700">
                {currentUser?.branch || "No branch"}
              </div>
            )}
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard title="Total Leads" value={totalLeads} icon={Target} trend="up" change={15} />
          <KPICard title="Call Leads" value={totalCallLeads} icon={Phone} trend="up" />
          <KPICard title="WhatsApp Leads" value={totalWhatsappLeads} icon={Target} trend="up" />
          <KPICard title="Form Leads" value={totalInstantFormLeads} icon={Target} trend="up" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TrendChart
            title="Daily Lead Generation by Source"
            data={trendData}
            lines={[
              { dataKey: "callLeads", name: "Call Leads" },
              { dataKey: "whatsappLeads", name: "WhatsApp Leads" },
              { dataKey: "instantFormLeads", name: "Form Leads" }
            ]}
          />
          {selectedBranch === "All Branches" && (
            <BranchComparisonChart
              title="Leads by Branch"
              data={branchData}
              dataKey="value"
              metric="Leads"
            />
          )}
        </div>

        {/* Reports Table */}
        <ReportTable
          title="Daily Reports"
          data={filteredReports.map(r => ({
            date: format(parseISO(r.report_date), "MMM d, yyyy"),
            branch: r.branch,
            callLeads: r.call_leads || 0,
            whatsappLeads: r.whatsapp_leads || 0,
            formLeads: r.instant_form_leads || 0,
            totalLeads: (r.call_leads || 0) + (r.whatsapp_leads || 0) + (r.instant_form_leads || 0),
            notes: r.notes || ""
          })).sort((a, b) => new Date(b.date) - new Date(a.date))}
          columns={[
            { header: "Date", accessor: "date" },
            { header: "Branch", accessor: "branch" },
            { header: "Call Leads", accessor: "callLeads" },
            { header: "WhatsApp Leads", accessor: "whatsappLeads" },
            { header: "Form Leads", accessor: "formLeads" },
            { header: "Total Leads", accessor: "totalLeads" },
            { 
              header: "Notes", 
              accessor: "notes",
              render: (val) => val ? (
                <span className="text-sm text-slate-600 truncate max-w-xs block" title={val}>
                  {val.substring(0, 50)}{val.length > 50 ? "..." : ""}
                </span>
              ) : "-"
            }
          ]}
        />
      </div>
    </div>
  );
}