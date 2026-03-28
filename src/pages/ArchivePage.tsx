import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Download } from 'lucide-react';
import { format } from 'date-fns';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const ArchivePage = () => {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('vouchers')
        .select('*, categories(name)')
        .eq('month', parseInt(month))
        .eq('year', parseInt(year))
        .order('voucher_date', { ascending: true });
      setVouchers(data || []);
      setLoading(false);
    };
    fetch();
  }, [month, year]);

  const formatCurrency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const years = [];
  for (let y = new Date().getFullYear(); y >= 2020; y--) years.push(y);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><FolderOpen className="w-6 h-6 text-primary" /> Arsip Voucher</h1>
        <p className="page-description">Arsip voucher berdasarkan bulan dan tahun</p>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">
            {MONTHS[parseInt(month) - 1]} {year}
            <Badge variant="secondary" className="ml-2">{vouchers.length} voucher</Badge>
          </CardTitle>
        </CardHeader>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
                ) : vouchers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada voucher pada periode ini</TableCell></TableRow>
                ) : (
                  vouchers.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.voucher_number}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{v.description}</TableCell>
                      <TableCell>{v.categories?.name || '-'}</TableCell>
                      <TableCell>{format(new Date(v.voucher_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(v.amount)}</TableCell>
                      <TableCell>
                        {v.file_url ? (
                          <a href={v.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                            <Download className="w-3 h-3" /> Unduh
                          </a>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchivePage;
