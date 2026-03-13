import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/components/ui/toast";

export default function ProfilePage() {
  const { token, user, updateUser } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(user?.email || "");
  const [emailLoading, setEmailLoading] = useState(false);

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    if (!email) return;
    setEmailLoading(true);
    try {
      await api.updateEmail(token, email);
      updateUser({ email });
      toast({ title: "Success", description: "Email updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: error.message || "Failed to update email" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (password.newPassword !== password.confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match" });
      return;
    }
    if (password.newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters" });
      return;
    }
    setPasswordLoading(true);
    try {
      await api.updatePassword(token, {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      toast({ title: "Success", description: "Password updated successfully" });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast({ title: "Error", description: error.message || "Failed to update password" });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="Settings"
        description="Manage your account settings and change your password."
      />

      <Card className="border-0">
        <CardHeader>
          <CardTitle className="text-lg">Update Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your new email"
                required
              />
            </div>
            <Button type="submit" disabled={emailLoading || email === user?.email}>
              {emailLoading ? "Updating..." : "Update Email"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader>
          <CardTitle className="text-lg">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Current Password</label>
              <Input
                type="password"
                value={password.currentPassword}
                onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">New Password</label>
              <Input
                type="password"
                value={password.newPassword}
                onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Confirm New Password</label>
              <Input
                type="password"
                value={password.confirmPassword}
                onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
