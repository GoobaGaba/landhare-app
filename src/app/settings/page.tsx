
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            Application Settings
          </CardTitle>
          <CardDescription>
            This area is reserved for future application-wide settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            User-specific preferences and account management are available on your Profile page. More general application settings will be available here in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
