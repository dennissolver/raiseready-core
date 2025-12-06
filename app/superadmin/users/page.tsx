'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, Search, UserCog, Eye, Ban, Mail, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

interface User {
  id: string;
  email: string;
  user_role: string;
  created_at: string;
  last_sign_in_at?: string;
  full_name?: string;
}

export default function SuperadminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'superadmin',
  });

  useEffect(() => {
    checkSuperadminAccess();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, roleFilter]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const checkSuperadminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: superadmin } = await supabase
        .from('superadmins')
        .select('*')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();

      if (!superadmin) {
        router.push('/');
        return;
      }

      loadUsers();
    } catch (error) {
      console.error('Error checking access:', error);
      router.push('/');
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);

      // Get all users from founders table
      const { data: foundersData, error: foundersError } = await supabase
        .from('founders')
        .select('*')
        .order('created_at', { ascending: false });

      if (foundersError) throw foundersError;

      setUsers((foundersData as User[]) || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(query) ||
        user.full_name?.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.user_role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const impersonateUser = async (userId: string) => {
    // Log the impersonation
    await supabase.from('admin_audit_log').insert({
      admin_id: (await supabase.auth.getUser()).data.user?.id,
      action_type: 'impersonate',
      resource_type: 'user',
      resource_id: userId,
      metadata: {
        action: 'Impersonation started',
        timestamp: new Date().toISOString()
      }
    });

    // In a real implementation, you would:
    // 1. Generate a special impersonation token
    // 2. Redirect to that user's dashboard with the token
    // For now, just show an alert
    alert('Impersonation feature: This would log you in as the selected user.');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Badge variant="destructive">Superadmin</Badge>;
      case 'investor':
        return <Badge variant="default">Investor</Badge>;
      case 'founder':
        return <Badge variant="secondary">Founder</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/superadmin">
                <Button variant="ghost" size="sm">
                  ← Back
                </Button>
              </Link>
              <Shield className="w-6 h-6 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold">User Management</h1>
                <p className="text-sm text-muted-foreground">
                  View and manage all platform users
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {users.filter(u => u.user_role === 'founder').length}
                </div>
                <div className="text-sm text-muted-foreground">Founders</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {users.filter(u => u.user_role === 'investor').length}
                </div>
                <div className="text-sm text-muted-foreground">Investors</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {users.filter(u => u.user_role === 'superadmin').length}
                </div>
                <div className="text-sm text-muted-foreground">Superadmins</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="founder">Founders</SelectItem>
                    <SelectItem value="investor">Investors</SelectItem>
                    <SelectItem value="superadmin">Superadmins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Users ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-semibold">{user.email}</div>
                          {getRoleBadge(user.user_role)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </span>
                            {user.last_sign_in_at && (
                              <span>
                                Last login: {new Date(user.last_sign_in_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewUserDetails(user)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>

                        {user.user_role !== 'superadmin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => impersonateUser(user.id)}
                          >
                            <UserCog className="w-4 h-4 mr-2" />
                            Impersonate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* User Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about this user
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {selectedUser.email}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">Role</div>
                <div>{getRoleBadge(selectedUser.user_role)}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">User ID</div>
                <div className="text-xs font-mono bg-muted p-2 rounded">
                  {selectedUser.id}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">Created At</div>
                <div>{new Date(selectedUser.created_at).toLocaleString()}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
