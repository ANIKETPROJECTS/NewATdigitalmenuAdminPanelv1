import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Store, Menu, Users, Crown, LogOut, Edit, Trash2, Settings, UserPlus, LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";
import QRCodeModal from "@/components/QRCodeModal";
import AdminSettingsModal from "@/components/AdminSettingsModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";

interface Restaurant {
  _id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  image: string;
  website?: string;
  qrCode?: string;
  isActive: boolean;
  otpEnabled: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'users' | 'restaurants'>('restaurants');
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    email: "",
    assignedRestaurant: ""
  });
  const [editedUser, setEditedUser] = useState({
    username: "",
    email: "",
    password: "",
    assignedRestaurant: ""
  });

  const [lastAdminUser, setLastAdminUser] = useState<string>("");
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isMaster = adminUser.role === 'master' || adminUser.username === 'admin' || adminUser.username?.toLowerCase() === 'admin';

  // Invalidate queries when the admin user changes to ensure fresh data for different roles
  useEffect(() => {
    const currentAdminId = adminUser._id || adminUser.id || "";
    if (lastAdminUser && lastAdminUser !== currentAdminId) {
      console.log(`👤 Admin user changed from ${lastAdminUser} to ${currentAdminId} - invalidating cache`);
      queryClient.invalidateQueries();
    }
    setLastAdminUser(currentAdminId);
  }, [adminUser._id, adminUser.id, lastAdminUser]);

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["/api/admin/restaurants"],
    queryFn: async () => {
      return await apiRequest("/api/admin/restaurants");
    },
  });

  const { data: adminUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      return await apiRequest("/api/admin/users");
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Admin user created successfully" });
      setUserModalOpen(false);
      setNewUser({ username: "", password: "", email: "", assignedRestaurant: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create user", variant: "destructive" });
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    // Clear TanStack Query cache on logout
    queryClient.clear();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    setLocation("/admin/login");
  };

  const deleteMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      return await apiRequest(`/api/admin/restaurants/${restaurantId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Restaurant deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete restaurant",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (restaurantId: string, restaurantName: string) => {
    if (window.confirm(`Are you sure you want to delete "${restaurantName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(restaurantId);
    }
  };

  const editUserMutation = useMutation({
    mutationFn: async (userData: { id: string; username: string; email: string; password?: string; assignedRestaurant: string }) => {
      const body: any = { username: userData.username, email: userData.email, assignedRestaurant: userData.assignedRestaurant };
      if (userData.password) {
        body.password = userData.password;
      }
      return await apiRequest(`/api/admin/users/${userData.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Admin user updated successfully" });
      setEditUserModalOpen(false);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      // Also invalidate restaurants in case the assigned restaurant changed
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Admin user deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    }
  });

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditedUser({
      username: user.username,
      email: user.email,
      password: "",
      assignedRestaurant: user.assignedRestaurant || ""
    });
    setEditUserModalOpen(true);
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (window.confirm(`Are you sure you want to delete "${username}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const updateOtpMutation = useMutation({
    mutationFn: async ({ id, otpEnabled }: { id: string; otpEnabled: boolean }) => {
      return await apiRequest(`/api/admin/restaurants/${id}`, {
        method: "PUT",
        body: JSON.stringify({ otpEnabled }),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "OTP settings updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update OTP settings", variant: "destructive" });
    }
  });

  const updateAllOtpMutation = useMutation({
    mutationFn: async (otpEnabled: boolean) => {
      const promises = restaurants.map(r => 
        apiRequest(`/api/admin/restaurants/${r._id}`, {
          method: "PUT",
          body: JSON.stringify({ otpEnabled }),
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "All restaurants OTP settings updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update all OTP settings", variant: "destructive" });
    }
  });

  if (isLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-blue-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center space-x-3 min-w-0">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 truncate">
                  Airavata Technologies
                </h1>
                <p className="text-sm sm:text-base text-gray-600 truncate">
                  Restaurant Management System
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900 truncate max-w-32 lg:max-w-none">
                  Welcome, {adminUser.username}
                </p>
                <p className="text-xs text-gray-600 truncate max-w-32 lg:max-w-none">
                  {adminUser.email}
                </p>
              </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 px-2 sm:px-3"
                >
                  <Settings className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 px-2 sm:px-3"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-gray-600 text-sm truncate">{isMaster ? 'Total Restaurants' : 'Your Restaurant'}</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {restaurants?.length || 0}
                  </p>
                </div>
                <Store className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          {isMaster && (
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-gray-600 text-sm truncate">Active Restaurants</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {restaurants?.filter((r: any) => r.isActive).length || 0}
                  </p>
                </div>
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          )}
          
          <Card className="bg-white border-gray-200 shadow-sm sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-gray-600 text-sm truncate">Total Items</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">-</p>
                </div>
                <Menu className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle - Only for Master Admin */}
        {isMaster && (
          <div className="mb-6 flex gap-2">
            <Button
              onClick={() => setCurrentView('users')}
              variant={currentView === 'users' ? 'default' : 'outline'}
              className={`${
                currentView === 'users'
                  ? 'bg-blue-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              data-testid="button-view-users"
            >
              <Users className="w-4 h-4 mr-2" />
              Admin Users
            </Button>
            <Button
              onClick={() => setCurrentView('restaurants')}
              variant={currentView === 'restaurants' ? 'default' : 'outline'}
              className={`${
                currentView === 'restaurants'
                  ? 'bg-blue-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              data-testid="button-view-restaurants"
            >
              <Store className="w-4 h-4 mr-2" />
              Restaurants
            </Button>
          </div>
        )}

        {/* Admin Users Section - Only for Master Admin */}
        {isMaster && currentView === 'users' && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Admin Users</h2>
            </div>

            {adminUsers?.length === 0 ? (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-6 sm:p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No admin users found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {adminUsers?.map((user: any) => (
                  <Card key={user._id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg text-gray-900 truncate">
                            {user.username}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-600 truncate">
                            {user.email}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant="default" 
                          className={`${
                            user.role === 'master' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          } flex-shrink-0`}
                        >
                          {user.role === 'master' ? 'Master' : 'Admin'}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col">
                      {user.assignedRestaurant && (
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Assigned Restaurant:</span>
                          </p>
                          <p className="text-sm text-blue-600 truncate">
                            {typeof user.assignedRestaurant === 'object' ? user.assignedRestaurant?.name : 'Unknown'}
                          </p>
                        </div>
                      )}
                      {!user.assignedRestaurant && (
                        <p className="text-sm text-gray-500 mb-4">No restaurant assigned</p>
                      )}
                      <div className="flex gap-2 mt-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="border-blue-600 text-blue-600 hover:bg-blue-50 flex-1"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user._id, user.username)}
                          className="border-red-600 text-red-600 hover:bg-red-50 flex-1"
                          disabled={deleteUserMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Restaurants Section */}
        {(!isMaster || currentView === 'restaurants') && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{isMaster ? 'Restaurants' : 'Your Restaurant'}</h2>
              {isMaster && (
                <div className="flex items-center space-x-2 mt-2 bg-white p-2 rounded-md border shadow-sm">
                  <span className="text-sm font-medium text-gray-700">Universal OTP:</span>
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-xs border-blue-600 text-blue-600"
                      onClick={() => updateAllOtpMutation.mutate(true)}
                      disabled={updateAllOtpMutation.isPending}
                    >
                      Enable All
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-xs border-red-600 text-red-600"
                      onClick={() => updateAllOtpMutation.mutate(false)}
                      disabled={updateAllOtpMutation.isPending}
                    >
                      Disable All
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {isMaster && (
                <Button
                  onClick={() => setUserModalOpen(true)}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 w-full sm:w-auto"
                  data-testid="button-add-user"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              )}
              {isMaster && (
                <Button
                  onClick={() => setLocation("/admin/restaurants/new")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold w-full sm:w-auto"
                  data-testid="button-add-restaurant"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Restaurant
                </Button>
              )}
            </div>
          </div>

          {restaurants?.length === 0 ? (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-6 sm:p-8 text-center">
                <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No restaurants found</p>
                {isMaster && (
                  <Button
                    onClick={() => setLocation("/admin/restaurants/new")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Restaurant
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {restaurants?.map((restaurant: Restaurant) => (
                <Card key={restaurant._id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <img
                          src={restaurant.image}
                          alt={restaurant.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg text-gray-900 truncate">
                            {restaurant.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-600 truncate">
                            {restaurant.address}
                          </CardDescription>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                            {restaurant.email}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={restaurant.isActive ? "default" : "secondary"} 
                        className={`${restaurant.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"} flex-shrink-0`}
                      >
                        {restaurant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {isMaster && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Label htmlFor={`otp-${restaurant._id}`} className="text-xs text-gray-500">OTP Login</Label>
                        <Switch
                          id={`otp-${restaurant._id}`}
                          checked={restaurant.otpEnabled !== false}
                          onCheckedChange={(checked) => {
                            updateOtpMutation.mutate({ id: restaurant._id, otpEnabled: checked });
                          }}
                          disabled={updateOtpMutation.isPending}
                        />
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {restaurant.description}
                    </p>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Phone:</span>{" "}
                        <span className="truncate">{restaurant.phone}</span>
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="mt-auto">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {isMaster && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/admin/restaurants/${restaurant._id}/edit`)}
                            className="border-blue-600 text-blue-600 hover:bg-blue-50 text-xs sm:text-sm"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/admin/restaurants/${restaurant._id}/dashboard`)}
                          className={`border-blue-600 text-blue-600 hover:bg-blue-50 text-xs sm:text-sm ${!isMaster ? 'col-span-2' : ''}`}
                          data-testid={`button-dashboard-${restaurant._id}`}
                        >
                          <LayoutDashboard className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Dashboard
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        {restaurant.website && restaurant.qrCode && (
                          <div className="flex-1">
                            <QRCodeModal
                              website={restaurant.website}
                              qrCode={restaurant.qrCode}
                              restaurantName={restaurant.name}
                            />
                          </div>
                        )}
                        {isMaster && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(restaurant._id, restaurant.name)}
                            className="border-red-600 text-red-600 hover:bg-red-50 text-xs sm:text-sm flex-1"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        )}
      </main>

      {/* Edit User Dialog */}
      <Dialog open={editUserModalOpen} onOpenChange={setEditUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>Update admin user details and restaurant assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={editedUser.username} onChange={e => setEditedUser({...editedUser, username: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editedUser.email} onChange={e => setEditedUser({...editedUser, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Password (Leave empty to keep current)</Label>
              <Input type="password" value={editedUser.password} onChange={e => setEditedUser({...editedUser, password: e.target.value})} placeholder="Enter new password or leave blank" />
            </div>
            <div className="space-y-2">
              <Label>Assign Restaurant</Label>
              <Select value={typeof editedUser.assignedRestaurant === 'object' ? editedUser.assignedRestaurant?._id || "unassigned" : (editedUser.assignedRestaurant || "unassigned")} onValueChange={val => setEditedUser({...editedUser, assignedRestaurant: val === "unassigned" ? "" : val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a restaurant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">No Restaurant</SelectItem>
                  {restaurants?.map((r: any) => (
                    <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserModalOpen(false)}>Cancel</Button>
            <Button onClick={() => editUserMutation.mutate({ id: editingUser._id, username: editedUser.username, email: editedUser.email, password: editedUser.password, assignedRestaurant: editedUser.assignedRestaurant })} disabled={editUserMutation.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Creation Dialog */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>Create a new admin account and assign them to a restaurant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Assign Restaurant</Label>
              <Select onValueChange={val => setNewUser({...newUser, assignedRestaurant: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants?.map((r: any) => (
                    <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserModalOpen(false)}>Cancel</Button>
            <Button onClick={() => createUserMutation.mutate(newUser)} disabled={createUserMutation.isPending}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Admin Settings Modal */}
      <AdminSettingsModal isOpen={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}