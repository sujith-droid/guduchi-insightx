import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function DepartmentCard({ 
  title, 
  icon: Icon, 
  metrics, 
  color = "indigo",
  status 
}) {
  const colorClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
    cyan: "bg-cyan-50 text-cyan-600"
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", colorClasses[color])}>
              <Icon className="w-5 h-5" />
            </div>
            <CardTitle className="text-base font-semibold text-slate-800">
              {title}
            </CardTitle>
          </div>
          {status && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                status === "good" && "bg-emerald-50 text-emerald-700",
                status === "warning" && "bg-amber-50 text-amber-700",
                status === "critical" && "bg-red-50 text-red-700"
              )}
            >
              {status === "good" ? "On Track" : status === "warning" ? "Needs Attention" : "Critical"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="space-y-1">
              <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
              <p className="text-xs text-slate-500">{metric.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}