import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function MonthlyTracker({ reports, currentMonth = new Date() }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const hasReportForDay = (day) => {
    return reports.some(report => {
      const reportDate = new Date(report.report_date);
      return isSameDay(reportDate, day);
    });
  };

  return (
    <Card className="p-4 border-0 shadow-sm overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {daysInMonth.map((day) => {
          const hasReport = hasReportForDay(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div key={day.toISOString()} className="flex flex-col items-center gap-1">
              <div className={cn(
                "text-xs font-medium w-8 h-8 rounded-lg flex items-center justify-center",
                isToday ? "bg-indigo-100 text-indigo-700" : "text-slate-600"
              )}>
                {format(day, "d")}
              </div>
              <div className={cn(
                "w-2 h-2 rounded-full",
                hasReport ? "bg-green-500" : "bg-red-500"
              )} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}