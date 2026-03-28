import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logActivity } from '@/lib/activity-logger';
import { useToast } from '@/hooks/use-toast';

const UsersPage = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, created_at');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    if (profiles && roles) {
      const roleMap: Record<string, string> = {};
      roles.forEach(r => { roleMap[r.user_id] = r.role; });
      setUsers(profiles.map(p => ({ ...p, role: roleMap[p.user_id] || 'staff' })));
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const changeRole = async (targetUserId: string, newRole: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as any })
      .eq('user_id', targetUserId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await logActivity(user.id, 'CHANGE_ROLE', 'user', targetUserId, { new_role: newRole });
      toast({ title: 'Role diperbarui' });
      fetchUsers();
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manajemen Pengguna</h1>
        <p className="page-description">Kelola pengguna dan hak akses</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || '(Belum diisi)'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    {u.user_id === user?.id ? (
                      <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                    ) : (
                      <Select value={u.role} onValueChange={v => changeRole(u.user_id, v)}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;
