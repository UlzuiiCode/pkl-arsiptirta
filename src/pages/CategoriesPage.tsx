import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activity-logger';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const CategoriesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetch = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (editing) {
        const { error } = await supabase.from('categories').update({ name, description }).eq('id', editing.id);
        if (error) throw error;
        await logActivity(user.id, 'UPDATE', 'category', editing.id, { name });
        toast({ title: 'Kategori diperbarui' });
      } else {
        const { data, error } = await supabase.from('categories').insert({ name, description }).select().single();
        if (error) throw error;
        await logActivity(user.id, 'CREATE', 'category', data.id, { name });
        toast({ title: 'Kategori ditambahkan' });
      }
      setDialogOpen(false);
      fetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (c: any) => {
    if (!user || !confirm('Hapus kategori ini?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await logActivity(user.id, 'DELETE', 'category', c.id, { name: c.name });
      toast({ title: 'Kategori dihapus' });
      fetch();
    }
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Kategori</h1>
          <p className="page-description">Kelola kategori voucher</p>
        </div>
        <Button onClick={() => { setEditing(null); setName(''); setDescription(''); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Tambah
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.description || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setName(c.name); setDescription(c.description || ''); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editing ? 'Edit' : 'Tambah'} Kategori</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nama</Label><Input value={name} onChange={e => setName(e.target.value)} required maxLength={100} /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Input value={description} onChange={e => setDescription(e.target.value)} maxLength={255} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit">{editing ? 'Perbarui' : 'Simpan'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;
