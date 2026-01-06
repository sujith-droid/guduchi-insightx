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
  const [tempRange, setTempRange] = useState(undefined);

  // Helper to normalize dates to start of day for comparison
  const normalizeDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {PRESETS.slice(0, 4).map((preset) => {
          const presetValue = preset.getValue();
          const isActive = 
            normalizeDate(dateRange.from).getTime() === normalizeDate(presetValue.from).getTime() &&
            normalizeDate(dateRange.to).getTime() === normalizeDate(presetValue.to).getTime();

          return (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              className={cn(
                "text-xs px-3 h-8 rounded-md",
                isActive
                  ? "bg-white shadow-sm text-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              )}
              onClick={() => onDateRangeChange(presetValue)}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          setTempRange(undefined);
        }
      }}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
            <CalendarIcon className="w-3.5 h-3.5" />
            {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={(range) => {
              setTempRange(range);
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
                setOpen(false);
                setTempRange(undefined);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}