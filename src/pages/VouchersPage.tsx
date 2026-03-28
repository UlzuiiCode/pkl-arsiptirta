import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Eye, Upload, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

interface Voucher {
  id: string;
  voucher_number: string;
  description: string;
  amount: number;
  category_id: string | null;
  voucher_date: string;
  month: number;
  year: number;
  file_url: string | null;
  file_name: string | null;
  created_by: string | null;
  created_at: string;
  categories?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

const VouchersPage = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  // Form state
  const [form, setForm] = useState({
    voucher_number: '',
    description: '',
    amount: '',
    category_id: '',
    voucher_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('vouchers')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });

    if (searchQuery) {
      query = query.or(`voucher_number.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    if (filterCategory && filterCategory !== 'all') {
      query = query.eq('category_id', filterCategory);
    }
    if (filterMonth && filterMonth !== 'all') {
      query = query.eq('month', parseInt(filterMonth));
    }
    if (filterYear && filterYear !== 'all') {
      query = query.eq('year', parseInt(filterYear));
    }

    const { data, error } = await query;
    if (!error && data) setVouchers(data as any);
    setLoading(false);
  }, [searchQuery, filterCategory, filterMonth, filterYear]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name');
    if (data) setCategories(data);
  };

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);
  useEffect(() => { fetchCategories(); }, []);

  const resetForm = () => {
    setForm({ voucher_number: '', description: '', amount: '', category_id: '', voucher_date: format(new Date(), 'yyyy-MM-dd') });
    setFile(null);
    setEditingVoucher(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (v: Voucher) => {
    setEditingVoucher(v);
    setForm({
      voucher_number: v.voucher_number,
      description: v.description,
      amount: String(v.amount),
      category_id: v.category_id || '',
      voucher_date: v.voucher_date,
    });
    setFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      const date = new Date(form.voucher_date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      let fileUrl = editingVoucher?.file_url || null;
      let fileName = editingVoucher?.file_name || null;

      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${year}/${month}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('voucher-files')
          .upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('voucher-files').getPublicUrl(path);
        fileUrl = urlData.publicUrl;
        fileName = file.name;
      }

      const payload = {
        voucher_number: form.voucher_number.trim(),
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        category_id: form.category_id || null,
        voucher_date: form.voucher_date,
        month,
        year,
        file_url: fileUrl,
        file_name: fileName,
      };

      if (editingVoucher) {
        const { error } = await supabase.from('vouchers').update(payload).eq('id', editingVoucher.id);
        if (error) throw error;
        await logActivity(user.id, 'UPDATE', 'voucher', editingVoucher.id, { voucher_number: payload.voucher_number });
        toast({ title: 'Voucher diperbarui' });
      } else {
        const { data, error } = await supabase.from('vouchers').insert({ ...payload, created_by: user.id }).select().single();
        if (error) throw error;
        await logActivity(user.id, 'CREATE', 'voucher', data.id, { voucher_number: payload.voucher_number });
        toast({ title: 'Voucher ditambahkan' });
      }

      setDialogOpen(false);
      resetForm();
      fetchVouchers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleDelete = async (v: Voucher) => {
    if (!user || !confirm('Hapus voucher ini?')) return;
    const { error } = await supabase.from('vouchers').delete().eq('id', v.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await logActivity(user.id, 'DELETE', 'voucher', v.id, { voucher_number: v.voucher_number });
      toast({ title: 'Voucher dihapus' });
      fetchVouchers();
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const years = Array.from(new Set(vouchers.map(v => v.year))).sort((a, b) => b - a);
  if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear());

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Manajemen Voucher</h1>
          <p className="page-description">Kelola data voucher keuangan</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Voucher
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nomor/deskripsi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger><SelectValue placeholder="Bulan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger><SelectValue placeholder="Tahun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun</SelectItem>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Voucher</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
                ) : vouchers.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada data voucher</TableCell></TableRow>
                ) : (
                  vouchers.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.voucher_number}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{v.description}</TableCell>
                      <TableCell>{(v.categories as any)?.name || '-'}</TableCell>
                      <TableCell>{format(new Date(v.voucher_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(v.amount)}</TableCell>
                      <TableCell>
                        {v.file_url ? (
                          <a href={v.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                            <Download className="w-3 h-3" /> {v.file_name || 'File'}
                          </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedVoucher(v); setDetailOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(v)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {role === 'admin' && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(v)} className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingVoucher ? 'Edit Voucher' : 'Tambah Voucher'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nomor Voucher</Label>
                <Input value={form.voucher_number} onChange={e => setForm(f => ({ ...f, voucher_number: e.target.value }))} required maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={form.voucher_date} onChange={e => setForm(f => ({ ...f, voucher_date: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required maxLength={500} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah (Rp)</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>File Voucher (PDF/Gambar)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} />
              {editingVoucher?.file_name && !file && (
                <p className="text-xs text-muted-foreground">File saat ini: {editingVoucher.file_name}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingVoucher ? 'Perbarui' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Detail Voucher</DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">No. Voucher:</span><p className="font-medium">{selectedVoucher.voucher_number}</p></div>
                <div><span className="text-muted-foreground">Tanggal:</span><p className="font-medium">{format(new Date(selectedVoucher.voucher_date), 'dd MMMM yyyy')}</p></div>
                <div><span className="text-muted-foreground">Kategori:</span><p className="font-medium">{(selectedVoucher.categories as any)?.name || '-'}</p></div>
                <div><span className="text-muted-foreground">Jumlah:</span><p className="font-medium">{formatCurrency(selectedVoucher.amount)}</p></div>
              </div>
              <div>
                <span className="text-muted-foreground">Deskripsi:</span>
                <p className="font-medium">{selectedVoucher.description}</p>
              </div>
              {selectedVoucher.file_url && (
                <div>
                  <span className="text-muted-foreground">File:</span>
                  <a href={selectedVoucher.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline mt-1">
                    <FileText className="w-4 h-4" /> {selectedVoucher.file_name}
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VouchersPage;
