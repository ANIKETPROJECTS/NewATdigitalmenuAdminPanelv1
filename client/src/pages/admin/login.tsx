import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Crown, Shield, User, ShieldCheck, UtensilsCrossed } from "lucide-react";
import backgroundImage from "./../../../../assets/admin_bg_image_1766987541263.jpg";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [role, setRole] = useState("admin");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string; role: string }) => {
      return await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: (data) => {
      if (data.requiresOtp) {
        setShowOtp(true);
        toast({
          title: "OTP Sent",
          description: data.message,
        });
        return;
      }
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.admin));
      queryClient.clear();
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      setLocation("/admin/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (otpData: { username: string; otp: string }) => {
      return await apiRequest("/api/admin/verify-otp", {
        method: "POST",
        body: JSON.stringify(otpData),
      });
    },
    onSuccess: (data) => {
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.admin));
      queryClient.clear();
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      setLocation("/admin/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showOtp) {
      if (!otp) {
        toast({
          title: "Error",
          description: "Please enter the OTP",
          variant: "destructive",
        });
        return;
      }
      verifyOtpMutation.mutate({ username, otp });
    } else {
      if (!username || !password) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }
      loginMutation.mutate({ username, password, role });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <Card className="relative w-full max-w-md mx-auto border border-amber-200 bg-white shadow-2xl rounded-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600" />
        <CardHeader className="text-center px-6 pt-8 pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-lg ring-4 ring-amber-100">
              <UtensilsCrossed className="w-9 h-9 text-white" />
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow ring-1 ring-amber-200">
                <Crown className="w-4 h-4 text-amber-600" />
              </div>
            </div>
          </div>
          <CardTitle
            className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent break-words"
            data-testid="text-app-title"
          >
            AT DIGITAL MENU
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-gray-600 mt-2">
            Restaurant Management System
          </CardDescription>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="h-px w-8 bg-amber-300" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-amber-700 font-semibold">
              Admin Portal
            </span>
            <span className="h-px w-8 bg-amber-300" />
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          {!showOtp && (
            <Tabs defaultValue="admin" onValueChange={setRole} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-2 bg-amber-50 p-1 border border-amber-200 rounded-lg">
                <TabsTrigger
                  value="admin"
                  className="flex items-center gap-2 text-amber-800 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md"
                  data-testid="tab-admin"
                >
                  <User className="w-4 h-4" />
                  Admin User
                </TabsTrigger>
                <TabsTrigger
                  value="master"
                  className="flex items-center gap-2 text-amber-800 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md"
                  data-testid="tab-master"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Master Admin
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!showOtp ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-amber-50/40 border-amber-200 text-gray-900 placeholder-gray-400 focus:border-amber-500 focus-visible:ring-amber-400 text-sm sm:text-base"
                    placeholder={`Enter your ${role} username`}
                    required
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-amber-50/40 border-amber-200 text-gray-900 placeholder-gray-400 focus:border-amber-500 focus-visible:ring-amber-400 text-sm sm:text-base"
                    placeholder="Enter your password"
                    required
                    data-testid="input-password"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                  Enter OTP
                </Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-amber-50/40 border-amber-200 text-gray-900 placeholder-gray-400 focus:border-amber-500 focus-visible:ring-amber-400 text-sm sm:text-base text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                  data-testid="input-otp"
                />
                <p className="text-xs text-gray-500 text-center">
                  Check your email for the 6-digit verification code.
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-amber-700 hover:text-amber-800 text-xs"
                  onClick={() => setShowOtp(false)}
                  data-testid="button-back-to-login"
                >
                  Back to Login
                </Button>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 text-white font-semibold py-2.5 sm:py-3 text-sm sm:text-base mt-6 shadow-md"
              disabled={loginMutation.isPending || verifyOtpMutation.isPending}
              data-testid="button-submit"
            >
              {showOtp
                ? (verifyOtpMutation.isPending ? "Verifying..." : "Verify OTP")
                : (loginMutation.isPending ? "Signing in..." : `Sign In as ${role === 'admin' ? 'Admin' : 'Master Admin'}`)}
            </Button>
          </form>

          <p className="mt-6 text-center text-[11px] text-gray-500">
            © {new Date().getFullYear()} AT Digital Menu. All rights reserved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
