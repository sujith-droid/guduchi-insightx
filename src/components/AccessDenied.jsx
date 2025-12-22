import { Card, CardContent } from "@/components/ui/card";
import { Lock, Mail } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardContent className="pt-12 pb-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            Access Not Configured
          </h2>
          <p className="text-slate-600 mb-6">
            Your account doesn't have branch and department access assigned yet.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Contact Administrator</p>
                <p className="text-blue-700">
                  Please reach out to your administrator to get access to your branch and department.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}