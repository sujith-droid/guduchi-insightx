import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata", "Online Consultation"];
const DEPARTMENTS = ["Reception", "Customer Support", "Pharmacy", "Digital Marketing", "Center Manager", "Analyst", "CEO"];

export default function UserSetup({ user, onComplete }) {
  const [branch, setBranch] = useState(user?.branch || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [saving, setSaving] = useState(false);

  const needsSetup = !user?.branch || !user?.department;

  const handleSave = async () => {
    if (!branch || !department) {
      toast.error("Please select both branch and department");
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe({ branch, department });
      toast.success("Profile updated successfully");
      onComplete?.();
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!needsSetup) return null;

  return (
    <Dialog open={needsSetup}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please select your branch and department to continue using the application.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger id="branch">
                <SelectValue placeholder="Select your branch" />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Select your department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving || !branch || !department}
          className="w-full"
        >
          {saving ? "Saving..." : "Continue"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}