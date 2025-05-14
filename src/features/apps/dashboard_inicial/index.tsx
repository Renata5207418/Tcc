"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
// ... etc

interface IndicadoresGerais {
  totalConsultas: number;
  totalPacientes: number;
  totalMedicos: number;
  tempoMedioEspera: number;
  totalFeedbackRuim: number;
  mediaFeedback: number;
  lembretesPendentes: number;
}

interface ConsultasAgendadas {
  consult_data: string;
  total_consultas: number;
}

interface TempoEspera {
  consult_data: string;
  tempo_medio_espera: number;
}

interface ConsultasPorStatus {
  status_consulta: string;
  total: number;
}

interface ConsultasPorEspecialidade {
  espec_nome: string;
  total: number;
}

const topNavLinks = [
  { title: "Dashboard", href: "/", isActive: true, disabled: false },
  { title: "Consultas", href: "/consultasgestao", isActive: false, disabled: false },
  { title: "Pacientes", href: "/pacientes", isActive: false, disabled: false },
];

const chartConfigConsultas = {
  consultas: {
    label: "Consultas Agendadas",
    color: "#FFB5A7",
  },
};

const chartConfigTempoEspera = {
  tempo: {
    label: "Tempo Médio de Espera (min)",
    color: "#BCEAD5",
  },
};

const chartStatusColors: Record<string, string> = {
  Pendente: "#FFD59E",
  Confirmada: "#FFB5A7",
  Concluída: "#BCEAD5",
  Cancelada: "#FCD5CE",
};

const chartEspecialidadeColors: Record<string, string> = {
  Cardiologia: "#FFB5A7",
  Pediatria: "#F8EAD8",
  Dermatologia: "#BCEAD5",
  Ortopedia: "#A0C4FF",
  Oftalmologia: "#BDB2FF",
};

const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [indicadores, setIndicadores] = useState<IndicadoresGerais | null>(null);
  const [consultasAgendadas, setConsultasAgendadas] = useState<ConsultasAgendadas[]>([]);
  const [tempoEspera, setTempoEspera] = useState<TempoEspera[]>([]);
  const [consultasStatus, setConsultasStatus] = useState<ConsultasPorStatus[]>([]);
  const [consultasEspecialidade, setConsultasEspecialidade] = useState<ConsultasPorEspecialidade[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/indicadores").then((r) => r.json()),
      fetch("/api/dashboard/consultas-agendadas").then((r) => r.json()),
      fetch("/api/dashboard/tempo-medio-espera").then((r) => r.json()),
      fetch("/api/dashboard/consultas-por-status").then((r) => r.json()),
      fetch("/api/dashboard/consultas-por-especialidade").then((r) => r.json()),
    ])
      .then(([ind, agendadas, espera, status, espec]) => {
        setIndicadores(ind);
        setConsultasAgendadas(agendadas);
        setTempoEspera(espera);
        setConsultasStatus(status);
        setConsultasEspecialidade(espec);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar dados:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Carregando dados...</p>
      </div>
    );
  }

  const showAlertaFeedbackRuim = indicadores && indicadores.totalFeedbackRuim > 10;
  const showAlertaFeedbackBaixo = indicadores && indicadores.mediaFeedback < 5;
  const showAlertaLembretes = indicadores && indicadores.lembretesPendentes > 0;

  return (
    <>
      <Header>
        <TopNav links={topNavLinks} />
        <div className="ml-auto">
          <ProfileDropdown />
        </div>
      </Header>

      <main className="p-4 space-y-8">
        <h1 className="text-3xl font-bold font-quicksand mb-2">Dashboard</h1>

        <div className="space-y-2">
          {showAlertaFeedbackRuim && (
            <div className="rounded-lg bg-pink-100 p-3 text-pink-800">
              <strong>Atenção:</strong> Há um número elevado de feedbacks ruins.
            </div>
          )}
          {showAlertaFeedbackBaixo && (
            <div className="rounded-lg bg-yellow-100 p-3 text-yellow-800">
              <strong>Alerta:</strong> A média de feedback está baixa.
            </div>
          )}
          {showAlertaLembretes && (
            <div className="rounded-lg bg-blue-100 p-3 text-blue-800">
              Você tem {indicadores?.lembretesPendentes} lembrete(s) pendente(s).
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Total de Consultas</CardTitle>
              <CardDescription>Consultas registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {indicadores?.totalConsultas}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Total de Pacientes</CardTitle>
              <CardDescription>Pacientes cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {indicadores?.totalPacientes}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Total de Médicos</CardTitle>
              <CardDescription>Médicos ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {indicadores?.totalMedicos}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Tempo Médio de Espera</CardTitle>
              <CardDescription>Em minutos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {indicadores?.tempoMedioEspera} min
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Consultas Agendadas por Dia</CardTitle>
              <CardDescription>Distribuição ao longo dos dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigConsultas} className="h-72">
                <LineChart data={consultasAgendadas} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="consult_data" tick={{ fill: "#6b7280" }} />
                  <YAxis tick={{ fill: "#6b7280" }} />
                  <ChartTooltipContent />
                  <ChartLegendContent verticalAlign="top" />
                  <Line
                    type="monotone"
                    dataKey="total_consultas"
                    stroke="var(--color-consultas)"
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Tempo Médio de Espera</CardTitle>
              <CardDescription>Média de espera (min) por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigTempoEspera} className="h-72">
                <LineChart data={tempoEspera} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="consult_data" tick={{ fill: "#6b7280" }} />
                  <YAxis tick={{ fill: "#6b7280" }} />
                  <ChartTooltipContent />
                  <ChartLegendContent verticalAlign="top" />
                  <Line
                    type="monotone"
                    dataKey="tempo_medio_espera"
                    stroke="var(--color-tempo)"
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Consultas por Status</CardTitle>
              <CardDescription>Visão de status das consultas</CardDescription>
            </CardHeader>
            <CardContent>
              <PieChart width={300} height={300}>
                <Pie
                  data={consultasStatus}
                  dataKey="total"
                  nameKey="status_consulta"
                  outerRadius={100}
                  label
                >
                  {consultasStatus.map((item, idx) => {
                    const fillColor = chartStatusColors[item.status_consulta] || "#ccc";
                    return <Cell key={item.status_consulta} fill={fillColor} />;
                  })}
                </Pie>
              </PieChart>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Consultas por Especialidade</CardTitle>
              <CardDescription>Áreas mais demandadas</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart width={300} height={300} data={consultasEspecialidade}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="espec_nome" tick={{ fill: "#6b7280" }} />
                <YAxis tick={{ fill: "#6b7280" }} />
                <Bar dataKey="total">
                  {consultasEspecialidade.map((entry, idx) => {
                    const fillColor = chartEspecialidadeColors[entry.espec_nome] || "#ccc";
                    return <Cell key={idx} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Média de Feedback</CardTitle>
              <CardDescription>Notas dos pacientes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {indicadores?.mediaFeedback.toFixed(1)}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Feedbacks Ruins</CardTitle>
              <CardDescription>Nota abaixo de 5</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {indicadores?.totalFeedbackRuim}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Lembretes Pendentes</CardTitle>
              <CardDescription>Para envio a pacientes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {indicadores?.lembretesPendentes}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default DashboardPage;
