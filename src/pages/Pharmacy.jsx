import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { DollarSign, CreditCard, TrendingDown, Star, FileText } from "lucide-react";

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

  useState(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user.department !== "Analyst" && user.branch) {
        setSelectedBranch(user.branch);
      }
    }).catch(() => {});
  }, []);

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

  // KPIs - Calculate totals
  const totalCash = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.cash || 0), 0);
  const totalPaytmSwipe = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.paytm_swipe || 0), 0);
  const totalExpenses = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.expenses || 0), 0);
  const totalGoogleReviews = filteredReports.reduce((sum, r) => sum + (r.pharmacy?.google_reviews || 0), 0);
  
  const totalSales = totalCash + totalPaytmSwipe;
  const difference = totalSales - totalExpenses;

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
    const diff = sales - expenses;
    
    return {
      date: format(parseISO(r.report_date), "MMM d, yyyy"),
      branch: r.branch,
      cash,
      paytmSwipe,
      expenses,
      totalSales: sales,
      difference: diff,
      googleReviews: r.pharmacy?.google_reviews || 0,
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
            {currentUser?.department === "Analyst" ? (
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
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <KPICard title="Cash" value={`₹${(totalCash / 1000).toFixed(1)}K`} icon={DollarSign} trend="up" />
          <KPICard title="Paytm/Swipe" value={`₹${(totalPaytmSwipe / 1000).toFixed(1)}K`} icon={CreditCard} trend="up" />
          <KPICard title="Expenses" value={`₹${(totalExpenses / 1000).toFixed(1)}K`} icon={TrendingDown} />
          <KPICard 
            title="Total Sales" 
            value={`₹${(totalSales / 1000).toFixed(1)}K`} 
            icon={DollarSign} 
            trend="up" 
          />
          <KPICard 
            title="Difference" 
            value={`₹${(difference / 1000).toFixed(1)}K`} 
            icon={DollarSign}
            trend={difference >= 0 ? "up" : "down"}
          />
          <KPICard title="Google Reviews" value={totalGoogleReviews} icon={Star} trend="up" />
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
            { header: "Expenses", accessor: "expenses", render: (val) => `₹${val.toLocaleString()}` },
            { header: "Total Sales", accessor: "totalSales", render: (val) => `₹${val.toLocaleString()}` },
            { 
              header: "Difference", 
              accessor: "difference", 
              render: (val) => (
                <span className={val >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                  ₹{val.toLocaleString()}
                </span>
              )
            },
            { header: "Reviews", accessor: "googleReviews" },
            { 
              header: "Not Buying Reason", 
              accessor: "reasonsNotBuying", 
              render: (val) => (
                val ? <span className="text-sm text-slate-600 truncate max-w-xs block">{val.substring(0, 40)}...</span> : "-"
              )
            }
          ]}
        />
      </div>
    </div>
  );
}