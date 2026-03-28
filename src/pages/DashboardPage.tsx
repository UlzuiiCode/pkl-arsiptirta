import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingUp, Calendar, FolderOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const DashboardPage = () => {
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, categories: 0 });
  const [monthlyData, setMonthlyData] = useState<{ name: string; total: number }[]>([]);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const [{ count: total }, { count: thisMonth }, { count: categories }] = await Promise.all([
        supabase.from('vouchers').select('*', { count: 'exact', head: true }),
        supabase.from('vouchers').select('*', { count: 'exact', head: true })
          .eq('month', now.getMonth() + 1).eq('year', now.getFullYear()),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
      ]);
      setStats({ total: total ?? 0, thisMonth: thisMonth ?? 0, categories: categories ?? 0 });

      // Monthly chart data
      const { data: vouchers } = await supabase
        .from('vouchers')
        .select('month')
        .eq('year', currentYear);

      const counts = new Array(12).fill(0);
      vouchers?.forEach(v => { counts[v.month - 1]++; });
      setMonthlyData(MONTHS.map((name, i) => ({ name, total: counts[i] })));
    };
    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Voucher', value: stats.total, icon: FileText, color: 'text-primary' },
    { title: 'Bulan Ini', value: stats.thisMonth, icon: Calendar, color: 'text-accent' },
    { title: 'Kategori', value: stats.categories, icon: FolderOpen, color: 'text-success' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Ringkasan data arsip voucher keuangan</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statCards.map(card => (
          <Card key={card.title} className="stat-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold font-heading mt-1">{card.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-lg bg-secondary flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Statistik Voucher {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Jumlah Voucher" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
