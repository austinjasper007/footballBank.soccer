import { Save, Globe, Shield, Database, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import HomepageHeroSettings from "./HomepageHeroSettings";

export function SettingsView() {
  return (
    <div className="space-y-6 max-w-4xl">
      <HomepageHeroSettings />

      {/* General Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="site-name">Site Name</Label>
              <Input id="site-name" defaultValue="FootballBank.soccer" />
            </div>
            <div>
              <Label htmlFor="site-url">Site URL</Label>
              <Input id="site-url" defaultValue="https://footballbank.soccer" />
            </div>
          </div>
          <div>
            <Label htmlFor="site-description">Site Description</Label>
            <Input id="site-description" defaultValue="The ultimate football player database and marketplace" />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Enable 2FA for admin accounts</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Logout</Label>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Automatically logout inactive sessions</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            API Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="api-key">Football Data API Key</Label>
            <Input id="api-key" type="password" defaultValue="••••••••••••••••" />
          </div>
          <div>
            <Label htmlFor="cache-duration">Cache Duration (minutes)</Label>
            <Input id="cache-duration" type="number" defaultValue="15" />
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input id="smtp-host" defaultValue="smtp.gmail.com" />
            </div>
            <div>
              <Label htmlFor="smtp-port">SMTP Port</Label>
              <Input id="smtp-port" defaultValue="587" />
            </div>
          </div>
          <div>
            <Label htmlFor="from-email">From Email</Label>
            <Input id="from-email" defaultValue="contact@footballbank.soccer" />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}