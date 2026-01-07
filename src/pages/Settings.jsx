import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, User, Building2, Shield, Bell, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BRANCHES = ["Bangalore", "Udupi", "Chennai", "Hyderabad", "Hubballi", "Kolkata", "HQ", "Online Consultation"];
const DEPARTMENTS = ["Reception", "Customer Support", "Pharmacy", "Center Manager", "Digital Marketing", "Leadership", "Admin"];
const ACCESS_LEVELS = [
  { value: "branch", label: "Branch Access", description: "View only assigned branch data" },
  { value: "central_admin", label: "Central Admin", description: "View and edit all branches" },
  { value: "read_only", label: "Read Only", description: "View all data, no editing" }
];

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [userSettings, setUserSettings] = useState({
    branch: "",
    department: "",
    access_level: "branch"
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setUserSettings({
        branch: user.branch || "",
        department: user.department || "",
        access_level: user.access_level || "branch"
      });
    };
    loadUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === "admin" || currentUser?.access_level === "central_admin"
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe(userSettings);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-2">
              <Shield className="w-4 h-4" />
              Access
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Profile Settings</CardTitle>
                <CardDescription>Update your personal information and branch assignment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={currentUser?.full_name || ""} disabled className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={currentUser?.email || ""} disabled className="bg-slate-50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <div className="px-3 py-2 bg-slate-100 rounded-md text-sm text-slate-700 border border-slate-200">
                      {currentUser?.branch || "Not assigned"}
                    </div>
                    <p className="text-xs text-slate-500">Contact administrator to change branch</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <div className="px-3 py-2 bg-slate-100 rounded-md text-sm text-slate-700 border border-slate-200">
                      {currentUser?.department || "Not assigned"}
                    </div>
                    <p className="text-xs text-slate-500">Contact administrator to change department</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Access Control</CardTitle>
                <CardDescription>Your access level determines what data you can see</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {ACCESS_LEVELS.map(level => (
                    <div
                      key={level.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        userSettings.access_level === level.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => {
                        if (currentUser?.role === "admin") {
                          setUserSettings({ ...userSettings, access_level: level.value });
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{level.label}</p>
                          <p className="text-sm text-slate-500">{level.description}</p>
                        </div>
                        {userSettings.access_level === level.value && (
                          <Badge className="bg-indigo-600">Current</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Access level changes require admin approval. Contact your administrator if you need different access.
                  </p>
                </div>
              </CardContent>
            </Card>

            {(currentUser?.role === "admin" || currentUser?.access_level === "central_admin") && allUsers.length > 0 && (
              <Card className="border-0 shadow-sm mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">User Management</CardTitle>
                  <CardDescription>View and manage user access levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900">{user.full_name || user.email}</p>
                          <p className="text-xs text-slate-500">{user.branch || "No branch"} • {user.department || "No department"}</p>
                        </div>
                        <Badge variant="outline">{user.access_level || "branch"}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to receive updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Daily Summary</p>
                      <p className="text-sm text-slate-500">Receive a daily summary of all branch reports</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Stock Alerts</p>
                      <p className="text-sm text-slate-500">Get notified when stock levels are low</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Issue Escalations</p>
                      <p className="text-sm text-slate-500">Alert when issues are escalated</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Marketing Performance</p>
                      <p className="text-sm text-slate-500">Weekly marketing performance summary</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}