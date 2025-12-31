import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Mail, Building2, Briefcase, Save, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BRANCHES = ["All Branches", "Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata"];
const DEPARTMENTS = ["CEO", "Analyst", "Reception", "Customer Support", "Pharmacy", "Digital Marketing", "Center Manager"];

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user.role !== "admin") {
        window.location.href = "/";
      }
    }).catch(() => {
      window.location.href = "/";
    });
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === "admin"
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }) => {
      return await base44.entities.User.update(userId, userData);
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      // Send email notification
      try {
        await base44.integrations.Core.SendEmail({
          to: variables.userEmail,
          subject: "Access Granted - BranchIQ Analytics",
          body: `Hello,

You have been granted access to BranchIQ Analytics platform.

Your Details:
- Branch: ${variables.userData.branch || "Not assigned"}
- Department: ${variables.userData.department || "Not assigned"}

You can now login and access your department's data at your assigned branch.

Best regards,
BranchIQ Team`
        });
      } catch (e) {
        console.error("Failed to send email:", e);
      }
      
      toast.success("User access updated successfully");
      setShowEditDialog(false);
      setEditingUser(null);
    },
    onError: () => {
      toast.error("Failed to update user access");
    }
  });

  const handleEditUser = (user) => {
    setEditingUser({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      branch: user.branch || "",
      department: user.department || ""
    });
    setShowEditDialog(true);
  };

  const handleSaveUser = () => {
    if (!editingUser.department) {
      toast.error("Please select a department");
      return;
    }

    // Digital Marketing, CEO, and Analyst get all branches
    const branchToSave = (editingUser.department === "Digital Marketing" || editingUser.department === "CEO" || editingUser.department === "Analyst")
      ? "All Branches" 
      : editingUser.branch;

    if (!branchToSave && editingUser.department !== "Digital Marketing" && editingUser.department !== "CEO" && editingUser.department !== "Analyst") {
      toast.error("Please select a branch");
      return;
    }

    updateUserMutation.mutate({
      userId: editingUser.id,
      userEmail: editingUser.email,
      userData: {
        branch: branchToSave,
        department: editingUser.department
      }
    });
  };

  if (!currentUser || currentUser.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage user access and permissions</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Users
            </CardTitle>
            <CardDescription>Assign branches and departments to users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || "-"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.branch ? (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
                              {user.branch}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.department ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                              {user.department}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {user.role === "admin" ? "Admin" : "User"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                            disabled={user.email === currentUser.email}
                          >
                            Edit Access
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
            {editingUser && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>User</Label>
                  <Input value={editingUser.email} disabled className="bg-slate-50" />
                </div>

                <div className="space-y-2">
                  <Label>Branch</Label>
                  {(editingUser.department === "Digital Marketing" || editingUser.department === "CEO" || editingUser.department === "Analyst") ? (
                    <div>
                      <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-md text-sm text-indigo-700 font-medium">
                        All Branches (Full access)
                      </div>
                      <p className="text-xs text-slate-500 mt-1">This role automatically gets access to all branches</p>
                    </div>
                  ) : (
                    <Select 
                      value={editingUser.branch} 
                      onValueChange={(v) => setEditingUser({ ...editingUser, branch: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map(b => (
                          <SelectItem key={b} value={b}>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              {b}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select 
                    value={editingUser.department} 
                    onValueChange={(v) => setEditingUser({ ...editingUser, department: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            {d}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <Mail className="w-4 h-4 inline mr-1" />
                    An email notification will be sent to the user with their access details.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveUser} 
                    disabled={updateUserMutation.isPending}
                    className="gap-2"
                  >
                    {updateUserMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save & Notify
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}