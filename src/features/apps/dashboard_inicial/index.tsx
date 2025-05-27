"use client";
import React, { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Header } from "@/components/layout/header";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { ChartContainer } from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  Label,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { Users, CalendarDays, Stethoscope, ArrowUpRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

type Row = Record<string, any>;
type Rows = Row[];

interface DonutRow {
  label: string;
  total: number;
  fill: string;
}

const palette = {
  chart1: "hsl(var(--chart-1))",
  chart2: "hsl(var(--chart-2))",
  chart3: "hsl(var(--chart-3))",
  chart4: "hsl(var(--chart-4))",
  chart5: "hsl(var(--chart-5))",
};

const generoColors: Record<string, string> = { F: "#f472b6", M: "#60a5fa", O: "#facc15", ND: "#64748b" };
const generoLabels: Record<string, string> = { F: "Feminino", M: "Masculino", O: "Outro", ND: "ND" };
const ativoColors: Record<string, string> = { Ativos: palette.chart3, Inativos: palette.chart4 };
const statusColors: Record<string, string> = {
  Agendada: palette.chart1,
  Concluída: palette.chart2,
  Presença: palette.chart3,
  Remarcada: palette.chart4,
  Ausência: palette.chart5,
  ND: palette.chart2,
};
const feedbackColors: Record<string, string> = { "1": "#ef4444", "2": "#ef4444", "3": "#facc15", "4": "#22c55e", "5": "#22c55e" };

const exportExcel = (name: string, data: Rows, map: Record<string, string> = {}) => {
  const rows = data.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) o[map[k] || k] = v;
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const rng = XLSX.utils.decode_range(ws["!ref"] || "");
  for (let c = 0; c <= rng.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) cell.s = { font: { bold: true, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: "FF2594AD" } } };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, name);
  XLSX.writeFile(wb, `${name}.xlsx`);
};

const dowMap: Record<string, string> = { Sunday: "Dom", Monday: "Seg", Tuesday: "Ter", Wednesday: "Qua", Thursday: "Qui", Friday: "Sex", Saturday: "Sáb" };
const iso = (d: Date) => format(d, "yyyy-MM-dd");
const api = async <T,>(path: string): Promise<T> => {
  const tryFetch = async (p: string) => {
    const r = await fetch(p);
    if (!r.ok) throw new Error();
    return r.json();
  };
  try {
    return await tryFetch(`/api${path}`);
  } catch {
    return tryFetch(path);
  }
};
const download = (url: string) => window.open(url, "_blank");

export default function DashboardPage() {
  const today = new Date();
  const firstPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const [range, setRange] = useState<DateRange>({ from: firstPrev, to: today });

  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState<Rows>([]);
  const [pacAtivo, setPacAtivo] = useState<DonutRow[]>([]);
  const [pacNovo, setPacNovo] = useState<Rows>([]);
  const [pacGenero, setPacGenero] = useState<DonutRow[]>([]);
  const [pacFaixa, setPacFaixa] = useState<Rows>([]);
  const [pacTotais, setPacTotais] = useState({ total: 0, ativos: 0 });

  const [profBasic, setProfBasic] = useState<{ total: number; ativos: number; inativos: number; media_idade: number } | null>(null);
  const [profCargo, setProfCargo] = useState<Rows>([]);
  const [profGenero, setProfGenero] = useState<DonutRow[]>([]);
  const [profFaixa, setProfFaixa] = useState<Rows>([]);
  const [profAtivoDonut, setProfAtivoDonut] = useState<DonutRow[]>([]);
  const [profissionais, setProfissionais] = useState<Rows>([]);

  const [consultas, setConsultas] = useState<any | null>(null);
  const [tipoGenero, setTipoGenero] = useState<Rows>([]);
  const [feedbackDonut, setFeedbackDonut] = useState<DonutRow[]>([]);

  const [medicamentos, setMedicamentos] = useState<Rows>([]);
  const [doencas, setDoencas] = useState<Rows>([]);
  const [alergias, setAlergias] = useState<Rows>([]);
  const [doencasFamiliares, setDoencasFamiliares] = useState<Rows>([]);
  const [posologias, setPosologias] = useState<Rows>([]);

  const fetchAll = useCallback(() => {
    setLoading(true);
    const qs = `?ini=${iso(range.from)}&fim=${iso(range.to)}`;
    Promise.allSettled([
      api<Rows>(`/pacientes${qs}`),
      api<Rows>(`/pacientes-novos${qs}`),
      api<Rows>("/pacientes-genero"),
      api<Record<string, number>>("/pacientes-faixa"),
      api<{ Ativos: number; Inativos: number }>("/pacientes-ativos"),
      api<Rows>("/profissionais"),
      api("/profissionais-basicos"),
      api("/profissionais-cargo"),
      api<Rows>("/profissionais-genero"),
      api<Record<string, number>>("/profissionais-faixa"),
      api<any>(`/consultas-basicos${qs}`),
      api<Rows>(`/consultas${qs}`),
      api("/medicamentos"),
      api("/doencas"),
      api("/alergias"),
      api<Record<string, number>>(`/feedback-agg${qs}`),
      api<Rows>(`/consultas-tipo-genero${qs}`),
      api("/doencasfamiliares"),
      api("/posologias"),
    ]).then((res) => {
      const get = <T,>(i: number, fb: T): T => (res[i].status === "fulfilled" ? (res[i] as PromiseFulfilledResult<T>).value : fb);

      setPacientes(get(0, []));
      setPacNovo(get(1, []));
      setPacGenero(get(2, []).map((g: any) => ({ label: generoLabels[g.genero] ?? g.genero, total: g.total, fill: generoColors[g.genero] ?? palette.chart5 })));
      setPacFaixa(Object.entries(get(3, {})).map(([faixa, total]) => ({ faixa, total })));

      const act = get(4, { Ativos: 0, Inativos: 0 });
      setPacTotais({ total: act.Ativos + act.Inativos, ativos: act.Ativos });
      setPacAtivo(Object.entries(act).map(([k, v]) => ({ label: k, total: v, fill: ativoColors[k] })));

      const profList = get<Rows>(5, []);
      setProfissionais(profList);
      const pb = get<any>(6, { total: 0, ativos: 0, inativos: 0, media_idade: 0 });
      setProfBasic(pb);
      setProfCargo(get(7, []));
      setProfGenero(get<Rows>(8, []).map((g: any) => ({ label: generoLabels[g.genero] ?? g.genero, total: g.total, fill: generoColors[g.genero] ?? palette.chart5 })));
      setProfFaixa(Object.entries(get(9, {})).map(([faixa, total]) => ({ faixa, total })));
      setProfAtivoDonut([{ label: "Ativos", total: pb.ativos, fill: palette.chart3 }, { label: "Inativos", total: pb.inativos, fill: palette.chart4 }]);

      const cons = get<any>(10, null);
      if (cons) cons.dow = cons.dow.map((d: any) => ({ ...d, dow: dowMap[d.dow] ?? d.dow }));
      setConsultas(cons);

      setMedicamentos(get(12, []));
      setDoencas(get(13, []));
      setAlergias(get(14, []));
      const fbAgg = get<Record<string, number>>(15, {});
      setFeedbackDonut(Object.entries(fbAgg).map(([label, total]) => ({ label, total, fill: feedbackColors[label] ?? palette.chart5 })));
      setTipoGenero(get(16, []));
      setDoencasFamiliares(get(17, []));
      setPosologias(get(18, []));
      setLoading(false);
    });
  }, [range]);

  useEffect(fetchAll, [fetchAll]);
  if (loading || !profBasic || !consultas) return <div className="h-screen flex items-center justify-center">Carregando…</div>;

  const qs = `?ini=${iso(range.from)}&fim=${iso(range.to)}`;
  const exportPacientes = () => download(`/api/export/pacientes${qs}`);
  const exportProfissionais = () => download(`/api/export/profissionais`);

  return (
    <>
      <Header>
        <TopNav links={[{ title: "Dashboard", href: "/", isActive: true }]} />
        <ProfileDropdown />
      </Header>
      <main className="p-4 space-y-8">
        <h1 className="text-3xl font-bold">Dashboard Clínico</h1>

        <Tabs defaultValue="consultas">
          <TabsList className="flex-wrap mb-4">
            <TabsTrigger value="consultas">Consultas</TabsTrigger>
            <TabsTrigger value="pacientes">Pacientes</TabsTrigger>
            <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="consultas">
            <DateRangePicker value={range} onChange={setRange} className="mb-6" />
            <div className="flex items-center gap-2 mb-4">
              <StatCard icon={<CalendarDays />} label="Consultas" value={consultas.total} />
              <StatCard icon={<ArrowUpRight />} label="Duração média (min)" value={consultas.duracao} />
              <Button size="sm" variant="secondary" className="ml-auto" onClick={() => download(`/api/export/consultas${qs}`)}>
                <Download className="h-4 w-4 mr-1" /> Exportar lista completa
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <DonutCard title="Status" data={consultas.status.map((s: any) => ({ label: s.status, total: s.total, fill: statusColors[s.status] ?? palette.chart5 }))} />
              <BarCard title="Tipo de consulta" data={consultas.tipo} dataKey="total" labelKey="tipo" />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <LineCard title="Consultas por dia" data={consultas.dia} dataKey="total" labelKey="rotulo" />
              <BarCard title="Por dia da semana" data={consultas.dow} dataKey="total" labelKey="dow" />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <BarCard title="Faixa etária dos pacientes" data={Object.entries(consultas.idade_paciente).map(([faixa, total]) => ({ faixa, total }))} dataKey="total" labelKey="faixa" />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <BarCard title="Faixa etária dos médicos" data={Object.entries(consultas.idade_medico).map(([faixa, total]) => ({ faixa, total }))} dataKey="total" labelKey="faixa" />
              <DonutCard title="Gênero do paciente" data={consultas.genero_paciente.map((g: any) => ({ label: generoLabels[g.genero] ?? g.genero, total: g.total, fill: generoColors[g.genero] ?? palette.chart5 }))} />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <DonutCard title="Feedbacks" data={feedbackDonut} />
              <MultiBarCard title="Tipo de consulta por gênero" data={tipoGenero} keys={["F", "M", "O", "ND"]} labelKey="tipo" />
            </div>
          </TabsContent>

          <TabsContent value="pacientes">
            <div className="flex items-center gap-2 mb-4">
              <StatCard icon={<Users />} label="Pacientes" value={pacTotais.total} />
              <StatCard icon={<Users />} label="Ativos" value={pacTotais.ativos} />
              <Button size="sm" variant="secondary" className="ml-auto" onClick={exportPacientes}>
                <Download className="h-4 w-4 mr-1" /> Exportar lista completa
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <DonutCard title="Ativos vs Inativos" data={pacAtivo} />
              <DonutCard title="Por gênero" data={pacGenero} />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <AreaCard title="Novos pacientes" data={pacNovo} dataKey="total" labelKey="rotulo" />
              <BarCard title="Faixa etária" data={pacFaixa} dataKey="total" labelKey="faixa" />
            </div>
          </TabsContent>

          <TabsContent value="profissionais">
            <div className="flex items-center gap-2 mb-4">
              <StatCard icon={<Stethoscope />} label="Profissionais" value={profBasic.total} />
              <StatCard icon={<Stethoscope />} label="Ativos" value={profBasic.ativos} />
              <StatCard icon={<Stethoscope />} label="Inativos" value={profBasic.inativos} />
              <StatCard icon={<Stethoscope />} label="Média idade" value={profBasic.media_idade} />
              <Button size="sm" variant="secondary" className="ml-auto" onClick={exportProfissionais}>
                <Download className="h-4 w-4 mr-1" /> Exportar lista completa
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <DonutCard title="Ativos vs Inativos" data={profAtivoDonut} />
              <DonutCard title="Por gênero" data={profGenero} />
              <DonutCard
                title="Médicos, Enfermeiros e Outros"
                data={[
                  { label: "Médicos", total: profCargo.find((c) => c.cargo === "Médico")?.total ?? 0, fill: palette.chart1 },
                  { label: "Enfermeiros", total: profCargo.find((c) => c.cargo === "Enfermeiro")?.total ?? 0, fill: palette.chart2 },
                  {
                    label: "Outros",
                    total: profBasic.total -
                      (profCargo.find((c) => c.cargo === "Médico")?.total ?? 0) -
                      (profCargo.find((c) => c.cargo === "Enfermeiro")?.total ?? 0),
                    fill: palette.chart3,
                  },
                ]}
              />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-1">
              <BarCard title="Faixa etária" data={profFaixa} dataKey="total" labelKey="faixa" />
            </div>
          </TabsContent>

          <TabsContent value="relatorios">
            <div className="grid gap-6 lg:grid-cols-2">
              <SimpleListStat icon={<Download />} label="Medicamentos" rows={medicamentos} file="Medicamentos" map={{ id_medicamento: "ID", medicamento_nome: "Medicamento", posologias: "Posologias" }} />
              <SimpleListStat icon={<Download />} label="Doenças" rows={doencas} file="Doenças" map={{ id_doenca: "ID", doenca_nome: "Doença", doenca_cid: "CID" }} />
              <SimpleListStat icon={<Download />} label="Doenças Familiares" rows={doencasFamiliares} file="DoençasFamiliares" map={{ id_doenca_familiar: "ID", doenca_familiar_nome: "Doença Familiar", doenca_familiar_cid: "CID" }} />
              <SimpleListStat icon={<Download />} label="Alergias" rows={alergias} file="Alergias" map={{ id_alergia: "ID", alergia_nome: "Alergia", alergia_cid: "CID" }} />
              <SimpleListStat icon={<Download />} label="Posologias" rows={posologias.map((p) => ({ ...p, posologia_livre: p.posologia_livre ? "Sim" : "Não" }))} file="Posologias" map={{ id_posologia: "ID", descricao_posologia: "Descrição", posologia_livre: "Livre" }} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function SimpleListStat({ icon, label, rows, file, map }: { icon: React.ReactNode; label: string; rows: Rows; file: string; map: Record<string, string> }) {
  return rows.length ? (
    <div className="flex items-center gap-2">
      <StatCard icon={icon} label={label} value={rows.length} />
      <Button size="sm" variant="secondary" className="ml-auto" onClick={() => exportExcel(file, rows, map)}>
        <Download className="h-4 w-4 mr-1" /> Exportar Excel
      </Button>
    </div>
  ) : (
    <p className="text-center py-10 w-full">Sem dados de {label.toLowerCase()}.</p>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="flex-1">
      <CardHeader className="flex-row items-center gap-2">
        {icon}
        <div>
          <CardTitle>{value}</CardTitle>
          <CardDescription>{label}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

interface ChartCardCommon {
  title: string;
  className?: string;
}

function DonutCard({ title, data, className }: ChartCardCommon & { data: DonutRow[] }) {
  const total = data.reduce((s, r) => s + r.total, 0);
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer className="w-full aspect-square" config={{}}>
          <ResponsiveContainer>
            <PieChart>
              <RechartsTooltip formatter={(v) => [v]} labelFormatter={(l, p) => p?.[0]?.payload?.label ?? l} />
              <Legend verticalAlign="bottom" height={28} />
              <Pie data={data} dataKey="total" nameKey="label" innerRadius={60} outerRadius={100}>
                <Label position="center" content={<tspan className="text-lg font-semibold">{total || "—"}</tspan>} />
                {data.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function LineCard({ title, data, dataKey, labelKey }: ChartCardCommon & { data: Rows; dataKey: string; labelKey: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer className="w-full" config={{}}>
          <ResponsiveContainer height={250}>
            <LineChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={labelKey} />
              <YAxis />
              <RechartsTooltip formatter={(v) => [v]} labelFormatter={() => ""} />
              <Legend verticalAlign="bottom" height={28} />
              <Line type="monotone" dataKey={dataKey} stroke={palette.chart2} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function AreaCard({ title, data, dataKey, labelKey }: ChartCardCommon & { data: Rows; dataKey: string; labelKey: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer className="w-full" config={{}}>
          <ResponsiveContainer height={250}>
            <AreaChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={labelKey} />
              <YAxis />
              <RechartsTooltip formatter={(v) => [v]} labelFormatter={() => ""} />
              <Legend verticalAlign="bottom" height={28} />
              <Area type="monotone" dataKey={dataKey} stroke={palette.chart1} fill={palette.chart1} fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function BarCard({ title, data, dataKey, labelKey, horizontal, className }: ChartCardCommon & { data: Rows; dataKey: string; labelKey: string; horizontal?: boolean }) {
  if (!data.length)
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <p className="text-center py-10">Sem dados</p>
      </Card>
    );
  const height = horizontal ? Math.max(200, data.length * 28) : 300;
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer className="w-full" config={{}}>
          <ResponsiveContainer height={height}>
            <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 10 : 0 }}>
              {horizontal ? (
                <>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey={labelKey} axisLine={false} tickLine={false} width={120} />
                </>
              ) : (
                <>
                  <XAxis dataKey={labelKey} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                </>
              )}
              <RechartsTooltip formatter={(v) => [v]} labelFormatter={(l, p) => p?.[0]?.payload?.[labelKey] ?? l} />
              <Legend verticalAlign="bottom" height={28} />
              <Bar dataKey={dataKey} radius={4} fill={palette.chart1} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function MultiBarCard({ title, data, keys, labelKey, className }: ChartCardCommon & { data: Rows; keys: string[]; labelKey: string }) {
  if (!data.length)
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <p className="text-center py-10">Sem dados</p>
      </Card>
    );
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer className="w-full" config={{}}>
          <ResponsiveContainer height={300}>
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={labelKey} axisLine={false} tickLine={false} />
              <YAxis />
              <RechartsTooltip />
              <Legend verticalAlign="bottom" height={28} />
              {keys.map((k) => (
                <Bar key={k} dataKey={k} stackId="a" fill={generoColors[k] ?? palette.chart5} radius={2} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
