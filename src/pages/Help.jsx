import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Phone, 
  Package, 
  Megaphone, 
  ClipboardList,
  CheckCircle2,
  Calendar,
  Edit,
  Trash2,
  Plus
} from "lucide-react";

const departments = [
  {
    id: "reception",
    name: "Reception",
    icon: Users,
    color: "bg-blue-500",
    steps: [
      {
        title: "Navigate to Reception Page",
        description: "Click on 'Reception' in the sidebar menu to access the reception dashboard.",
        icon: Users
      },
      {
        title: "Click 'Add Report'",
        description: "Click the 'Add Report' button in the top right corner of the page.",
        icon: Plus
      },
      {
        title: "Fill in Today's Data",
        description: "Enter the following information for today's date:\n• Walk-ins: Number of visitors who walked in\n• Appointments: Number of scheduled appointments\n• Conversions: Number of successful conversions\n• No Shows: Appointments that didn't show up\n• Cancellations: Cancelled appointments\n• QR Scans: YouTube, Instagram, and Facebook QR code scans",
        icon: Edit
      },
      {
        title: "Add Notes (Optional)",
        description: "Add any relevant observations or notes about the day in the notes field.",
        icon: Edit
      },
      {
        title: "Submit Report",
        description: "Click the 'Create Report' button to submit your daily report.",
        icon: CheckCircle2
      }
    ]
  },
  {
    id: "support",
    name: "Customer Support",
    icon: Phone,
    color: "bg-green-500",
    steps: [
      {
        title: "Navigate to Customer Support Page",
        description: "Click on 'Customer Support' in the sidebar menu.",
        icon: Phone
      },
      {
        title: "Click 'Add Report'",
        description: "Click the 'Add Report' button in the top right corner.",
        icon: Plus
      },
      {
        title: "Enter Call Statistics",
        description: "Fill in the team-level statistics:\n• Total Answered Calls\n• Total Appointments\n• Total Outbound Calls",
        icon: Edit
      },
      {
        title: "Add Executive Data",
        description: "For each executive, enter:\n• Executive Name\n• Appointment Count\n• Followups\n• Confirmed Appointments\n• Warm Appointments\n\nClick 'Add Executive' to add more team members.",
        icon: Users
      },
      {
        title: "Submit Report",
        description: "Review the information and click 'Create Report' to submit.",
        icon: CheckCircle2
      }
    ]
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    icon: Package,
    color: "bg-purple-500",
    steps: [
      {
        title: "Navigate to Pharmacy Page",
        description: "Click on 'Pharmacy' in the sidebar menu.",
        icon: Package
      },
      {
        title: "Click 'Add Report'",
        description: "Click the 'Add Report' button in the top right corner.",
        icon: Plus
      },
      {
        title: "Enter Financial Data",
        description: "Fill in the financial information:\n• Cash: Total cash sales\n• Paytm/Swipe: Digital payments\n• Expenses: Daily expenses",
        icon: Edit
      },
      {
        title: "Add Customer Feedback",
        description: "Enter:\n• Reasons Not Buying: Common reasons customers didn't purchase\n• Google Reviews: Number of reviews received",
        icon: Edit
      },
      {
        title: "Submit Report",
        description: "Click 'Create Report' to submit your pharmacy report.",
        icon: CheckCircle2
      }
    ]
  },
  {
    id: "marketing",
    name: "Digital Marketing",
    icon: Megaphone,
    color: "bg-orange-500",
    steps: [
      {
        title: "Navigate to Marketing Page",
        description: "Click on 'Digital Marketing' in the sidebar menu.",
        icon: Megaphone
      },
      {
        title: "Click 'Add Report'",
        description: "Click the 'Add Report' button in the top right corner.",
        icon: Plus
      },
      {
        title: "Enter Lead Data",
        description: "Fill in the lead information:\n• Call Leads: Leads from phone calls\n• WhatsApp Leads: Leads from WhatsApp\n• Instant Form Leads: Leads from online forms",
        icon: Edit
      },
      {
        title: "Add Notes",
        description: "Include any observations about campaign performance or lead quality.",
        icon: Edit
      },
      {
        title: "Submit Report",
        description: "Click 'Create Report' to submit your marketing report.",
        icon: CheckCircle2
      }
    ]
  },
  {
    id: "manager",
    name: "Center Manager",
    icon: ClipboardList,
    color: "bg-indigo-500",
    steps: [
      {
        title: "Navigate to Center Manager Page",
        description: "Click on 'Center Manager' in the sidebar menu.",
        icon: ClipboardList
      },
      {
        title: "Click 'Add Report'",
        description: "Click the 'Add Report' button in the top right corner.",
        icon: Plus
      },
      {
        title: "Enter Performance Data",
        description: "Fill in the daily metrics:\n• Number of Patients: Total patients served\n• Revenue: Total revenue generated\n• Projected Patients: Expected patients for the day\n• Projected Revenue: Expected revenue",
        icon: Edit
      },
      {
        title: "Add Operational Notes",
        description: "Include any important observations, issues, or achievements.",
        icon: Edit
      },
      {
        title: "Submit Report",
        description: "Click 'Create Report' to submit your center manager report.",
        icon: CheckCircle2
      }
    ]
  }
];

const generalTips = [
  {
    title: "Submit Reports Daily",
    description: "Make sure to submit your report every day for accurate tracking and analytics."
  },
  {
    title: "Edit Existing Reports",
    description: "If you made a mistake, click the Edit icon on any report in the table to update it."
  },
  {
    title: "Delete Reports",
    description: "Click the Trash icon to delete a report if needed (use with caution)."
  },
  {
    title: "View Date Range",
    description: "Use the date range selector at the top to view historical data."
  },
  {
    title: "Filter by Branch",
    description: "Analysts and admins can filter data by branch using the branch selector."
  }
];

export default function Help() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Help & Tutorial</h1>
            <p className="text-slate-500 mt-1">Learn how to submit daily reports for your department</p>
          </div>
        </div>

        {/* Department Tutorials */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Daily Report Submission Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="reception" className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                {departments.map((dept) => (
                  <TabsTrigger key={dept.id} value={dept.id} className="flex items-center gap-2">
                    <dept.icon className="w-4 h-4" />
                    <span className="hidden md:inline">{dept.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {departments.map((dept) => (
                <TabsContent key={dept.id} value={dept.id} className="space-y-6 mt-6">
                  {/* Department Header */}
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className={`p-4 rounded-xl ${dept.color}`}>
                      <dept.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900">{dept.name}</h3>
                      <p className="text-slate-500">Step-by-step guide to submit your daily report</p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-4">
                    {dept.steps.map((step, index) => (
                      <Card key={index} className="border-l-4 border-l-indigo-500">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-indigo-600 font-semibold">{index + 1}</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <step.icon className="w-5 h-5 text-indigo-600" />
                                <h4 className="text-lg font-semibold text-slate-900">{step.title}</h4>
                              </div>
                              <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* General Tips */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">General Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {generalTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">{tip.title}</h4>
                    <p className="text-sm text-slate-600">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Need Help Section */}
        <Card className="border-0 shadow-sm bg-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <Phone className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">Need Additional Help?</h4>
                <p className="text-sm text-slate-600">
                  If you have questions or encounter any issues, please contact your administrator or IT support team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}