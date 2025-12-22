import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Mail, Building2, Briefcase, Shield, Plus, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];
const DEPARTMENTS = ["Analyst", "Reception", "Customer Support", "Pharmacy", "Marketing", "Center Manager"];

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    branch: "",
    department: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === "admin"
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }) => {
      await base44.entities.User.update(userId, userData);
      
      // Send email notification
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: "Access Granted - BranchIQ Analytics",
          body: `
Hello ${user.full_name || 'User'},

You have been granted access to the BranchIQ Analytics platform.

Your Access Details:
- Branch: ${userData.branch || 'Not assigned'}
- Department: ${userData.department || 'Not assigned'}

You can now log in and access your department's data for your assigned branch.

Login at: ${window.location.origin}

Best regards,
BranchIQ Team
          `.trim()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User access updated and email sent");
      setShowEditDialog(false);
      setEditingUser(null);
    },
    onError: () => {
      toast.error("Failed to update user access");
    }
  });

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      branch: user.branch || "",
      department: user.department || ""
    });
    setShowEditDialog(true);
  };

  const handleSaveUser = () => {
    if (!formData.branch || !formData.department) {
      toast.error("Please select both branch and department");
      return;
    }
    updateUserMutation.mutate({
      userId: editingUser.id,
      userData: formData
    });
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
              <p className="text-slate-600">You don't have permission to access user management.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage user access and permissions</p>
        </div>

        {/* Users List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">All Users</CardTitle>
            <CardDescription>Assign branch and department access to users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {allUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium text-slate-900">{user.full_name || "No name"}</p>
                        {user.role === "admin" && (
                          <Badge className="bg-indigo-100 text-indigo-700">Admin</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        {user.branch && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {user.branch}
                          </span>
                        )}
                        {user.department && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {user.department}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="gap-2"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit Access
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Access</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Input value={editingUser?.full_name || editingUser?.email || ""} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editingUser?.email || ""} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={formData.branch} onValueChange={(v) => setFormData({ ...formData, branch: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveUser} 
                  disabled={updateUserMutation.isPending}
                  className="gap-2"
                >
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Send Email"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}