import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Today", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Yesterday", getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: "Last 7 Days", getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Last 30 Days", getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "This Week", getValue: () => ({ from: startOfWeek(new Date()), to: new Date() }) },
  { label: "This Month", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
];

export default function DateRangeSelector({ dateRange, onDateRangeChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {PRESETS.slice(0, 4).map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            className={cn(
              "text-xs px-3 h-8 rounded-md",
              format(dateRange.from, "yyyy-MM-dd") === format(preset.getValue().from, "yyyy-MM-dd") &&
              format(dateRange.to, "yyyy-MM-dd") === format(preset.getValue().to, "yyyy-MM-dd")
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => onDateRangeChange(preset.getValue())}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
            <CalendarIcon className="w-3.5 h-3.5" />
            {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
                setOpen(false);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}