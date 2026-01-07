import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

const BRANCHES = ["All Branches", "Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata", "Online Consultation"];

export default function BranchSelector({ value, onChange, showAll = true, user }) {
  // Admin, Analyst, and CEO always see all branches
  const shouldShowAll = showAll || user?.role === "admin" || user?.department === "Analyst" || user?.department === "CEO";
  const branches = shouldShowAll ? BRANCHES : BRANCHES.slice(1);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] bg-white border-slate-200">
        <Building2 className="w-4 h-4 mr-2 text-slate-400" />
        <SelectValue placeholder="Select branch" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch} value={branch}>
            {branch}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}