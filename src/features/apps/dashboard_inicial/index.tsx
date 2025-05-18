"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Header } from "@/components/layout/header";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
import {
  Users,
  CalendarDays,
  Stethoscope,
  ArrowUpRight,
  Pill,
  Heart,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

/* ---------- tipos ---------- */
type Pair = Record<string, any>;
type Rows = Pair[];

interface DonutRow {
  label: string;
  total: number;
  fill: string;
}

/* ---------- paleta ---------- */
const chart1 = "#fecc16"; // primário
const chart2 = "#62a8ea";
const chart3 = "#68d391";
const chart4 = "#ed7362";
const chart5 = "#8256d0";

const generoColors: Record<string, string> = {
  F: "#f472b6",
  M: "#60a5fa",
  O: "#facc15",
  ND: "#64748b",
};
const generoLabels: Record<string, string> = {
  F: "Feminino",
  M: "Masculino",
  O: "Outro",
  ND: "ND",
};
const ativoColors = { Ativos: chart3, Inativos: chart4 };
const statusColors: Record<string, string> = {
  Pendente: chart1,
  Confirmada: chart3,
  Concluída: chart2,
  Cancelada: chart4,
  ND: chart5,
};
const blank = {};

/* ---------- helpers ---------- */
const excel = (sheet: string, data: Rows) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), sheet);
  XLSX.writeFile(wb, `${sheet}.xlsx`);
};

const dowMap: Record<string, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
  Sunday: "Dom",
  Monday: "Seg",
  Tuesday: "Ter",
  Wednesday: "Qua",
  Thursday: "Qui",
  Friday: "Sex",
  Saturday: "Sáb",
};

/** Tenta rota com /api e sem /api para cobrir qualquer registro do blueprint */
const api = async (path: string) => {
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

/* ---------- componente ---------- */
export default function DashboardPage() {
  /* --- datas globais --- */
  const [range, setRange] = useState<{ from: Date; to: Date } | null>(null);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  /* --- controle de loading / modal --- */
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; rows: Rows }>({
    open: false,
    rows: [],
  });

  /* ---------- estados de página (mesmo nomes de antes) ---------- */
  const [pacAtivo, setPacAtivo] = useState<DonutRow[]>([]);
  const [pacNovo, setPacNovo] = useState<Rows>([]);
  const [pacGenero, setPacGenero] = useState<DonutRow[]>([]);
  const [pacUF, setPacUF] = useState<Rows>([]);
  const [pacCidade, setPacCidade] = useState<Rows>([]);
  const [pacFaixa, setPacFaixa] = useState<Rows>([]);
  const [pacTotais, setPacTotais] = useState({ total: 0, ativos: 0 });

  const [profBasic, setProfBasic] = useState<{
    total: number;
    ativos: number;
    inativos: number;
    media_idade: number;
  } | null>(null);
  const [profCargo, setProfCargo] = useState<Rows>([]);
  const [profGenero, setProfGenero] = useState<DonutRow[]>([]);
  const [profFaixa, setProfFaixa] = useState<Rows>([]);
  const [profAtivoDonut, setProfAtivoDonut] = useState<DonutRow[]>([]);

  const [medDistrib, setMedDistrib] = useState<{
    total: number;
    posUnicas: number;
    media: string;
    livres: number;
    catPie: DonutRow[];
  } | null>(null);
  const [posCount, setPosCount] = useState<Rows>([]);

  const [medicamentos, setMedicamentos] = useState<Rows>([]);
  const [doencas, setDoencas] = useState<Rows>([]);
  const [alergias, setAlergias] = useState<Rows>([]);
  const [consultas, setConsultas] = useState<any | null>(null);

  /* ---------- fetchAll ---------- */
  const fetchAll = useCallback(() => {
    setLoading(true);
    const qs = range ? `?ini=${fmt(range.from)}&fim=${fmt(range.to)}` : "";

    Promise.all([
      /* pacientes */
      api("/pacientes-ativos"),
      api("/pacientes-novos" + qs),
      api("/pacientes-genero"),
      api("/pacientes-uf"),
      api("/pacientes-cidade"),
      api("/pacientes-faixa"),
      /* profissionais */
      api("/profissionais-basicos"),
      api("/profissionais-cargo"),
      api("/profissionais-genero"),
      api("/profissionais-faixa"),
      /* consultas */
      api("/consultas-basicos" + qs),
      /* outros */
      api("/medicamentos"),
      api("/doencas"),
      api("/alergias"),
    ])
      .then(
        ([
          pacAt,
          pacNv,
          pacGen,
          pacUf,
          pacCid,
          pacFx,
          profBs,
          profCg,
          profGen,
          profFx,
          consult,
          meds,
          doen,
          aler,
        ]) => {
          /* ------------ PACIENTES ------------ */
          setPacAtivo(
            Object.entries(pacAt).map(([k, v]) => ({
              label: k,
              total: v as number,
              fill: ativoColors[k as keyof typeof ativoColors] ?? chart5,
            })),
          );
          setPacTotais({
            total: (pacAt.Ativos || 0) + (pacAt.Inativos || 0),
            ativos: pacAt.Ativos || 0,
          });
          setPacNovo(pacNv);
          setPacUF(pacUf);
          setPacCidade(pacCid);
          setPacFaixa(
            Object.entries(pacFx).map(([faixa, total]) => ({ faixa, total })),
          );
          setPacGenero(
            pacGen.map((g: any) => ({
              label: generoLabels[g.genero] ?? g.genero,
              total: g.total,
              fill: generoColors[g.genero] ?? chart5,
            })),
          );

          /* ------------ PROFISSIONAIS ------------ */
          setProfBasic(profBs);
          setProfCargo(profCg);
          setProfGenero(
            profGen.map((g: any) => ({
              label: generoLabels[g.genero] ?? g.genero,
              total: g.total,
              fill: generoColors[g.genero] ?? chart5,
            })),
          );
          setProfFaixa(
            Object.entries(profFx).map(([faixa, total]) => ({ faixa, total })),
          );
          setProfAtivoDonut([
            { label: "Ativos", total: profBs.ativos, fill: chart3 },
            { label: "Inativos", total: profBs.inativos, fill: chart4 },
          ]);

          /* ------------ CONSULTAS ------------ */
          consult.dow = consult.dow.map((d: any) => ({
            ...d,
            dow: dowMap[d.dow] ?? d.dow,
          }));
          setConsultas(consult);

          /* ------------ MEDICAMENTOS ------------ */
          setMedicamentos(meds);
          const posSet = new Set<string>();
          const posCnt: Record<string, number> = {};
          let cat1 = 0,
            cat2 = 0,
            cat3 = 0,
            livres = 0,
            totalPos = 0;
          meds.forEach((m: any) => {
            const list = m.posologias
              .split(";")
              .map((s: string) => s.trim())
              .filter(Boolean);
            if (!list.length) livres += 1;
            if (list.length === 1) cat1 += 1;
            if (list.length === 2) cat2 += 1;
            if (list.length >= 3) cat3 += 1;
            list.forEach((p: string) => {
              const k = p.toLowerCase();
              posSet.add(k);
              posCnt[k] = (posCnt[k] || 0) + 1;
            });
            totalPos += list.length;
          });
          setPosCount(
            Object.entries(posCnt)
              .map(([pos, total]) => ({ pos, total }))
              .sort((a, b) => b.total - a.total)
              .slice(0, 20),
          );
          setMedDistrib({
            total: meds.length,
            posUnicas: posSet.size,
            media: meds.length ? (totalPos / meds.length).toFixed(1) : "0",
            livres,
            catPie: [
              { label: "1 pos.", total: cat1, fill: chart1 },
              { label: "2 pos.", total: cat2, fill: chart2 },
              { label: "3+ pos.", total: cat3, fill: chart3 },
            ],
          });

          /* ------------ EXTRAS ------------ */
          setDoencas(doen);
          setAlergias(aler);

          setLoading(false);
        },
      )
      .catch(() => setLoading(false));
  }, [range]);

  useEffect(fetchAll, [fetchAll]);

  if (loading || !profBasic || !consultas)
    return (
      <div className="h-screen flex items-center justify-center">
        Carregando…
      </div>
    );

  /* ---------- JSX ---------- */
  return (
    <>
      <Header>
        <TopNav links={[{ title: "Dashboard", href: "/", isActive: true }]} />
        <ProfileDropdown />
      </Header>

      <main className="p-4 space-y-8">
        {/* -------- Modal -------- */}
        <Dialog
          open={modal.open}
          onOpenChange={(o) => setModal({ open: o, rows: [] })}
        >
          <DialogContent className="max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Detalhes</DialogTitle>
            </DialogHeader>
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(modal.rows, null, 2)}
            </pre>
            <Button
              variant="secondary"
              onClick={() => excel("detalhes", modal.rows)}
            >
              Exportar
            </Button>
          </DialogContent>
        </Dialog>

        <h1 className="text-3xl font-bold">Dashboard Clínico</h1>

        <Tabs defaultValue="consultas">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="consultas">Consultas</TabsTrigger>
            <TabsTrigger value="pacientes">Pacientes</TabsTrigger>
            <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
            <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
            <TabsTrigger value="doencas">Doenças</TabsTrigger>
            <TabsTrigger value="alergias">Alergias</TabsTrigger>
          </TabsList>

          {/* -------------------- CONSULTAS -------------------- */}
          <TabsContent value="consultas">
            <DateRangePicker
              value={range}
              onChange={setRange}
              className="mb-6"
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<CalendarDays />}
                label="Consultas"
                value={consultas.total}
              />
              <StatCard
                icon={<ArrowUpRight />}
                label="Tempo médio de espera (min)"
                value={consultas.espera}
              />
              <StatCard
                icon={<ArrowUpRight />}
                label="Duração média (min)"
                value={consultas.duracao}
              />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <DonutCard
                title="Status das consultas"
                data={consultas.status.map((s: any) => ({
                  label: s.status,
                  total: s.total,
                  fill: statusColors[s.status] ?? chart5,
                }))}
              />

              <BarCard
                title="Consultas por tipo"
                data={consultas.tipo}
                dataKey="total"
                labelKey="tipo"
              />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <LineCard
                title="Consultas por dia"
                data={consultas.dia}
                dataKey="total"
                labelKey="rotulo"
              />

              <BarCard
                title="Consultas por dia da semana"
                data={consultas.dow}
                dataKey="total"
                labelKey="dow"
              />
            </div>
          </TabsContent>

          {/* -------------------- PACIENTES -------------------- */}
          <TabsContent value="pacientes">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<Users />} label="Pacientes" value={pacTotais.total} />
              <StatCard icon={<Users />} label="Ativos" value={pacTotais.ativos} />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <DonutCard title="Ativos vs Inativos" data={pacAtivo} />
              <DonutCard title="Pacientes por gênero" data={pacGenero} />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <AreaCard
                title="Novos pacientes"
                data={pacNovo}
                dataKey="total"
                labelKey="rotulo"
              />
              <BarCard
                title="Pacientes por faixa etária"
                data={pacFaixa}
                dataKey="total"
                labelKey="faixa"
              />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <BarCard
                title="Pacientes por Estado (UF)"
                data={pacUF}
                dataKey="total"
                labelKey="uf"
                horizontal
              />
              <BarCard
                title="Pacientes por Cidade (top 20)"
                data={pacCidade}
                dataKey="total"
                labelKey="cidade"
                horizontal
              />
            </div>
          </TabsContent>

          {/* -------------------- PROFISSIONAIS -------------------- */}
          <TabsContent value="profissionais">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Stethoscope />}
                label="Profissionais"
                value={profBasic.total}
              />
              <StatCard
                icon={<Stethoscope />}
                label="Ativos"
                value={profBasic.ativos}
              />
              <StatCard
                icon={<Stethoscope />}
                label="Inativos"
                value={profBasic.inativos}
              />
              <StatCard
                icon={<Stethoscope />}
                label="Média de idade"
                value={profBasic.media_idade}
              />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-3">
              <DonutCard title="Ativos vs Inativos" data={profAtivoDonut} />
              <DonutCard title="Por gênero" data={profGenero} />
              <DonutCard
                title="Médicos, Enfermeiros e Outros"
                data={[
                  {
                    label: "Médicos",
                    total: profCargo.find((c) => c.cargo === "Médico")?.total ?? 0,
                    fill: chart1,
                  },
                  {
                    label: "Enfermeiros",
                    total:
                      profCargo.find((c) => c.cargo === "Enfermeiro")?.total ?? 0,
                    fill: chart2,
                  },
                  {
                    label: "Outros",
                    total:
                      profBasic.total -
                      (profCargo.find((c) => c.cargo === "Médico")?.total ?? 0) -
                      (profCargo.find((c) => c.cargo === "Enfermeiro")?.total ??
                        0),
                    fill: chart3,
                  },
                ]}
              />
            </div>

            <div className="grid gap-6 mt-6 lg:grid-cols-2">
              <BarCard
                title="Profissionais por cargo"
                data={profCargo}
                dataKey="total"
                labelKey="cargo"
                horizontal
              />
              <BarCard
                title="Faixa etária dos profissionais"
                data={profFaixa}
                dataKey="total"
                labelKey="faixa"
              />
            </div>
          </TabsContent>

          {/* -------------------- MEDICAMENTOS -------------------- */}
          <TabsContent value="medicamentos">
            {medDistrib ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon={<Pill />}
                    label="Medicamentos"
                    value={medDistrib.total}
                  />
                  <StatCard
                    icon={<Pill />}
                    label="Posologias únicas"
                    value={medDistrib.posUnicas}
                  />
                  <StatCard
                    icon={<Pill />}
                    label="Média/medic."
                    value={medDistrib.media}
                  />
                  <StatCard
                    icon={<Pill />}
                    label="Posologia livre"
                    value={medDistrib.livres}
                  />
                </div>

                <DonutCard
                  className="mt-6 max-w-md"
                  title="Distribuição de posologias"
                  data={medDistrib.catPie}
                />

                <BarCard
                  className="mt-6"
                  title="Posologias mais comuns (top 20)"
                  data={posCount}
                  dataKey="total"
                  labelKey="pos"
                  horizontal
                />

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Exportar lista completa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      onClick={() => excel("medicamentos", medicamentos)}
                    >
                      Exportar
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-center py-10">Sem dados de medicamentos.</p>
            )}
          </TabsContent>

          {/* -------------------- DOENÇAS -------------------- */}
          <TabsContent value="doencas">
            {doencas.length ? (
              <>
                <StatCard
                  icon={<Heart />}
                  label="Doenças catalogadas"
                  value={doencas.length}
                />
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Exportar lista completa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" onClick={() => excel("doencas", doencas)}>
                      Exportar
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-center py-10">Sem dados de doenças.</p>
            )}
          </TabsContent>

          {/* -------------------- ALERGIAS -------------------- */}
          <TabsContent value="alergias">
            {alergias.length ? (
              <>
                <StatCard
                  icon={<AlertCircle />}
                  label="Alergias"
                  value={alergias.length}
                />
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Exportar lista completa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      onClick={() => excel("alergias", alergias)}
                    >
                      Exportar
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-center py-10">Sem dados de alergias.</p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

/* ---------- sub-componentes ---------- */
function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
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

function DonutCard({
  title,
  data,
  className,
}: {
  title: string;
  data: DonutRow[];
  className?: string;
}) {
  const total = data.reduce((s, r) => s + r.total, 0);
  return (
    <Card className={className}>
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={blank} className="aspect-square">
          <ResponsiveContainer>
            <PieChart>
              <RechartsTooltip
                formatter={(v) => [v]}
                labelFormatter={(l, p) =>
                  p?.[0]?.payload?.label ?? p?.[0]?.payload?.status ?? l
                }
              />
              <Legend verticalAlign="bottom" height={28} />
              <Pie
                data={data}
                dataKey="total"
                nameKey="label"
                innerRadius={60}
                outerRadius={100}
              >
                <Label
                  position="center"
                  content={
                    <tspan className="text-lg font-semibold">
                      {total || "—"}
                    </tspan>
                  }
                />
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

function LineCard({
  title,
  data,
  dataKey,
  labelKey,
}: {
  title: string;
  data: Rows;
  dataKey: string;
  labelKey: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={blank}>
          <ResponsiveContainer height={250}>
            <LineChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={labelKey} />
              <YAxis />
              <RechartsTooltip
                formatter={(v) => [v]}
                labelFormatter={() => ""}
              />
              <Legend verticalAlign="bottom" height={28} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={chart2}
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function AreaCard({
  title,
  data,
  dataKey,
  labelKey,
}: {
  title: string;
  data: Rows;
  dataKey: string;
  labelKey: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={blank}>
          <ResponsiveContainer height={250}>
            <AreaChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey={labelKey} />
              <YAxis />
              <RechartsTooltip
                formatter={(v) => [v]}
                labelFormatter={() => ""}
              />
              <Legend verticalAlign="bottom" height={28} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={chart1}
                fill={chart1}
                fillOpacity={0.25}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function BarCard({
  title,
  data,
  dataKey,
  labelKey,
  horizontal,
  className,
}: {
  title: string;
  data: Rows;
  dataKey: string;
  labelKey: string;
  horizontal?: boolean;
  className?: string;
}) {
  if (!data.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <p className="text-center py-10">Sem dados</p>
      </Card>
    );
  }

  const height = horizontal ? Math.max(200, data.length * 28) : 300;
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={blank}>
          <ResponsiveContainer height={height}>
            <BarChart
              data={data}
              layout={horizontal ? "vertical" : "horizontal"}
              margin={{ left: horizontal ? 10 : 0 }}
            >
              {horizontal ? (
                <>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey={labelKey}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                </>
              ) : (
                <>
                  <XAxis dataKey={labelKey} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                </>
              )}
              <RechartsTooltip
                formatter={(v) => [v]}
                labelFormatter={(l, p) =>
                  p?.[0]?.payload?.[labelKey] ?? l
                }
              />
              <Legend verticalAlign="bottom" height={28} />
              <Bar dataKey={dataKey} radius={4} fill={chart1} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
