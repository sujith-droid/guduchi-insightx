import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { Target, TrendingUp, DollarSign, Phone, FileText, Megaphone } from "lucide-react";

import KPICard from "@/components/dashboard/KPICard";
import BranchSelector from "@/components/dashboard/BranchSelector";
import DateRangeSelector from "@/components/dashboard/DateRangeSelector";
import TrendChart from "@/components/dashboard/TrendChart";
import BranchComparisonChart from "@/components/dashboard/BranchComparisonChart";
import MarketingSourceChart from "@/components/dashboard/MarketingSourceChart";
import ReportTable from "@/components/dashboard/ReportTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];
const SOURCES = ["Meta", "Google", "WhatsApp", "Organic", "Referral", "Other"];

const SOURCE_COLORS = {
  Meta: "bg-blue-100 text-blue-700",
  Google: "bg-red-100 text-red-700",
  WhatsApp: "bg-green-100 text-green-700",
  Organic: "bg-indigo-100 text-indigo-700",
  Referral: "bg-amber-100 text-amber-700",
  Other: "bg-slate-100 text-slate-700"
};

export default function Marketing() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 6),
    to: new Date()
  });

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
  const totalLeads = filteredReports.reduce((sum, r) => sum + (r.leads_generated || 0), 0);
  const totalConversions = filteredReports.reduce((sum, r) => sum + (r.conversions || 0), 0);
  const totalSpend = filteredReports.reduce((sum, r) => sum + (r.spend || 0), 0);
  const callLeads = filteredReports.reduce((sum, r) => sum + (r.call_leads || 0), 0);
  const formLeads = filteredReports.reduce((sum, r) => sum + (r.form_leads || 0), 0);

  const costPerLead = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(0) : 0;
  const costPerConversion = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(0) : 0;
  const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0;

  // Source data for pie chart
  const sourceData = SOURCES.map(source => ({
    source,
    value: filteredReports.filter(r => r.source === source).reduce((sum, r) => sum + (r.leads_generated || 0), 0)
  })).filter(s => s.value > 0);

  // Source performance table
  const sourcePerformance = SOURCES.map(source => {
    const data = filteredReports.filter(r => r.source === source);
    const leads = data.reduce((sum, r) => sum + (r.leads_generated || 0), 0);
    const conversions = data.reduce((sum, r) => sum + (r.conversions || 0), 0);
    const spend = data.reduce((sum, r) => sum + (r.spend || 0), 0);
    return {
      source,
      leads,
      conversions,
      spend,
      cpl: leads > 0 ? (spend / leads).toFixed(0) : 0,
      cpc: conversions > 0 ? (spend / conversions).toFixed(0) : 0,
      rate: leads > 0 ? ((conversions / leads) * 100).toFixed(1) : 0
    };
  }).filter(s => s.leads > 0);

  // Trend data
  const trendData = [];
  let currentDate = new Date(dateRange.from);
  while (currentDate <= dateRange.to) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayReports = filteredReports.filter(r => r.report_date === dateStr);
    trendData.push({
      date: format(currentDate, "MMM d"),
      leads: dayReports.reduce((sum, r) => sum + (r.leads_generated || 0), 0),
      conversions: dayReports.reduce((sum, r) => sum + (r.conversions || 0), 0),
      spend: dayReports.reduce((sum, r) => sum + (r.spend || 0), 0) / 1000
    });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  // Branch comparison
  const branchData = BRANCHES.map(branch => {
    const data = filteredReports.filter(r => r.branch === branch);
    return {
      branch,
      value: data.reduce((sum, r) => sum + (r.leads_generated || 0), 0)
    };
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Digital Marketing</h1>
            <p className="text-sm text-slate-500 mt-1">Lead generation & campaign performance</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BranchSelector value={selectedBranch} onChange={setSelectedBranch} />
            <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <KPICard title="Total Leads" value={totalLeads} icon={Target} trend="up" change={15} />
          <KPICard title="Conversions" value={totalConversions} icon={TrendingUp} trend="up" change={12} />
          <KPICard title="Total Spend" value={`₹${(totalSpend / 1000).toFixed(1)}K`} icon={DollarSign} />
          <KPICard title="Cost/Lead" value={`₹${costPerLead}`} icon={Target} trend={parseFloat(costPerLead) < 100 ? "up" : "down"} />
          <KPICard title="Call Leads" value={callLeads} icon={Phone} />
          <KPICard title="Form Leads" value={formLeads} icon={FileText} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <TrendChart
              title="Lead Generation Trend"
              data={trendData}
              lines={[
                { dataKey: "leads", name: "Leads" },
                { dataKey: "conversions", name: "Conversions" }
              ]}
            />
          </div>
          <MarketingSourceChart data={sourceData} title="Leads by Source" />
        </div>

        {/* Branch Comparison */}
        {selectedBranch === "All Branches" && (
          <div className="mb-8">
            <BranchComparisonChart
              title="Leads by Branch"
              data={branchData}
              dataKey="value"
              metric="Leads"
            />
          </div>
        )}

        {/* Source Performance */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Source Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sourcePerformance.map(source => (
                <Card key={source.source} className="border border-slate-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={SOURCE_COLORS[source.source]}>{source.source}</Badge>
                      <span className="text-sm text-slate-500">{source.rate}% conv.</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{source.leads}</p>
                        <p className="text-xs text-slate-500">Leads</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">₹{source.cpl}</p>
                        <p className="text-xs text-slate-500">CPL</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">₹{source.cpc}</p>
                        <p className="text-xs text-slate-500">CPC</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Table */}
        <ReportTable
          title="Campaign Reports"
          data={filteredReports.map(r => ({
            date: format(parseISO(r.report_date), "MMM d"),
            branch: r.branch,
            source: r.source,
            campaign: r.campaign_name || "-",
            leads: r.leads_generated || 0,
            conversions: r.conversions || 0,
            spend: r.spend || 0
          })).sort((a, b) => new Date(b.date) - new Date(a.date))}
          columns={[
            { header: "Date", accessor: "date" },
            { header: "Branch", accessor: "branch" },
            { header: "Source", accessor: "source", render: (val) => (
              <Badge variant="secondary" className={SOURCE_COLORS[val]}>{val}</Badge>
            )},
            { header: "Campaign", accessor: "campaign" },
            { header: "Leads", accessor: "leads" },
            { header: "Conv.", accessor: "conversions" },
            { header: "Spend", accessor: "spend", render: (val) => `₹${val.toLocaleString()}` }
          ]}
        />
      </div>
    </div>
  );
}