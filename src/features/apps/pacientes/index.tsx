"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Header } from "@/components/layout/header";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";

interface TopNavLink { title: string; href: string; isActive: boolean; disabled: boolean }
interface Patient {
  id_paciente: number;
  pac_cpf: string;
  pac_nome: string;
  pac_email: string;
  pac_telefone: string;
  pac_data_nascimento: string;
  pac_genero: string;
  pac_cep: string;
  pac_endereco: string;    // "Rua X, 123"
  pac_cidade: string;
  pac_estado: string;
  pac_data_cadastro: string;
  pac_ativo: boolean;
}

const topNavLinks: TopNavLink[] = [
  { title: "Início", href: "/", isActive: true, disabled: false },
  { title: "Consultas", href: "/consultasgestao", isActive: false, disabled: false },
  { title: "Pacientes", href: "/pacientes", isActive: true, disabled: false },
];

const CPF_RE = /^\d{11}$/;
function validarCPF(c: string): boolean {
  const cpf = c.replace(/\D/g, "");
  if (!CPF_RE.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (m: number) => {
    let sum = 0;
    for (let i = 0; i < m; i++) sum += parseInt(cpf.charAt(i)) * (m + 1 - i);
    return ((sum * 10) % 11) % 10;
  };
  return calc(9) === parseInt(cpf.charAt(9)) && calc(10) === parseInt(cpf.charAt(10));
}

function formatCPF(value: string): string {
  const v = value.replace(/\D/g, "");
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
    .slice(0, 14);
}

function formatPhone(value: string): string {
  const v = value.replace(/\D/g, "");
  return v
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
}

function formatCep(value: string): string {
  const v = value.replace(/\D/g, "");
  return v.replace(/(\d{5})(\d)/, "$1-$2").slice(0, 9);
}

function isPastOrToday(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr);
  return d <= today;
}


const NAME_RE   = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
const EMAIL_RE  = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,6})+$/;
const CEP_RE    = /^\d{8}$/;
const UF_SET    = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO"
]);
const DDD_SET   = new Set([
  "11","12","13","14","15","16","17","18","19",
  "21","22","24","27","28",
  "31","32","33","34","35","37","38",
  "41","42","43","44","45","46","47","48","49",
  "51","53","54","55",
  "61","62","64","63","65","66","67","68","69",
  "71","73","74","75","77","79",
  "81","82","83","84","85","86","87","88","89",
  "91","92","93","94","95","96","97","98","99"
]);

export const validarNome = (v: string): boolean => {
  const s = v.trim()
  if (s !== v) return false
  if (/\s{2,}/.test(s)) return false
  const parts = s.split(" ")
  if (parts.length < 2) return false
  if (s.length < 6 || s.length > 60) return false
  if (parts.some(p => p.length < 3)) return false
  const partRe = /^[A-ZÀ-Ö][a-zà-ö]+$/
  if (!parts.every(p => partRe.test(p))) return false
  if (/(.)\1\1/.test(s.replace(/ /g, ""))) return false
  return true
}

export const validarEmail = (v: string): boolean => {
  const e = v.trim()
  if (!e) return false
  if (e !== e.toLowerCase() || /\s/.test(e)) return false
  const [local, domain] = e.split("@")
  if (!local || !domain) return false
  if (
    local.length > 64 ||
    !/^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?$/.test(local) ||
    /\.\./.test(local)
  ) return false
  const labels = domain.split(".")
  if (
    labels.length < 2 ||
    labels.some(l => l.length < 2 || l.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(l)
    )
  ) return false
  return true
}

export const getTelefoneError = (v: string): string => {
  const n = v.replace(/\D/g, "")
  if (!n) return "Telefone é obrigatório."
  if (n.length !== 10 && n.length !== 11)
    return "Use 10 dígitos (fixo) ou 11 (móvel)."
  const ddd = n.slice(0,2)
  if (!DDD_SET.has(ddd)) return `DDD "${ddd}" inválido.`
  const body = n.slice(2)
  if (/^(\d)\1+$/.test(body)) return "Não use todos os dígitos iguais."
  if (n.length===11 && n[2] !== "9") return 'Celular deve iniciar com "9".'
  if (n.length===10 && !/[2-5]/.test(n[2])) return "Fixo deve iniciar com 2–5."
  return ""
}

export const getNomeError = (raw: string): string => {
  const v = raw.trim()
  if (!v) return "Nome é obrigatório."
  if (raw !== v) return "Remova espaços no início/fim."
  if (/\s{2,}/.test(v)) return "Não use mais de um espaço consecutivo."
  const parts = v.split(" ")
  if (parts.length < 2) return "Informe nome e sobrenome."
  if (v.length < 6) return "Nome muito curto (mínimo 6 caracteres)."
  if (v.length > 60) return "Nome muito longo (máximo 60 caracteres)."
  if (parts.some(p => p.length < 3)) return "Cada parte deve ter ao menos 3 letras."
  const partRe = /^[A-ZÀ-Ö][a-zà-ö]+$/
  if (!parts.every(p => partRe.test(p)))
    return "Cada parte deve iniciar com maiúscula e conter apenas letras."
  if (/(.)\1\1/.test(v.replace(/ /g, "")))
    return "Não use três letras iguais seguidas."
  return ""
}

export const getEmailError = (raw: string): string => {
  const e = raw.trim()
  if (!e) return "E-mail é obrigatório."
  if (e !== e.toLowerCase()) return "Use apenas letras minúsculas."
  if (/\s/.test(raw)) return "Não inclua espaços."
  const parts = e.split("@")
  if (parts.length !== 2) return "Formato deve ser usuario@dominio."
  const [local, domain] = parts
  if (local.length > 64) return "Parte local muito longa (máx 64 chars)."
  if (!/^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?$/.test(local))
    return "Caracteres inválidos na parte local."
  if (/\.\./.test(local)) return "Não use dois pontos consecutivos."
  const labels = domain.split(".")
  if (
    labels.length < 2 ||
    labels.some(l => l.length < 2 || l.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(l))
  ) return "Formato de domínio inválido."
  return ""
}

const PacientesPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active"|"inactive"|"all">("active");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create"|"edit">("create");
  const [selectedPatientId, setSelectedPatientId] = useState<number|null>(null);

  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [errors, setErrors] = useState<Partial<Record<string,string>>>({});
  const [loadingCep, setLoadingCep] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient|null>(null);

  // fetch pacientes
  const fetchPatients = () => {
    fetch("/api/pacientes")
      .then(res => res.json())
      .then(setPatients)
      .catch(console.error);
  };
  useEffect(fetchPatients, []);

  // clear dialog form
  const clearForm = () => {
    setCpf(""); setName(""); setEmail(""); setPhone("");
    setBirthDate(""); setGender(""); setCep("");
    setAddress(""); setNumber(""); setCity(""); setState("");
    setErrors({});
  };

  // open create
  const openCreateDialog = () => {
    clearForm();
    setDialogMode("create");
    setSelectedPatientId(null);
    setDialogOpen(true);
  };

  // open edit
  const openEditDialog = (id: number) => {
    const p = patients.find(x => x.id_paciente === id);
    if (p) {
      setCpf(p.pac_cpf);
      setName(p.pac_nome);
      setEmail(p.pac_email);
      setPhone(p.pac_telefone);
      setBirthDate(new Date(p.pac_data_nascimento).toISOString().slice(0, 10));
      setGender(p.pac_genero);
      setCep(p.pac_cep);
      // split "Rua X, 123"
      const [st, num=""] = p.pac_endereco.split(",").map(s => s.trim());
      setAddress(st);
      setNumber(num);
      setCity(p.pac_cidade);
      setState(p.pac_estado);
    }
    setDialogMode("edit");
    setSelectedPatientId(id);
    setDialogOpen(true);
  };

  // delete/reactivate
  const openDeleteAlert = (p: Patient) => {
    setPatientToDelete(p);
    setAlertOpen(true);
  };
  const handleConfirmDelete = () => {
    if (!patientToDelete) return;
    fetch(`/api/pacientes/${patientToDelete.id_paciente}`, { method: "DELETE" })
      .then(res => { if (!res.ok) throw new Error(); setAlertOpen(false); fetchPatients(); })
      .catch(console.error);
  };
  const handleReactivate = (id: number) => {
    fetch(`/api/pacientes/${id}/reativar`, { method: "PUT" })
      .then(res => { if (!res.ok) throw new Error(); fetchPatients(); })
      .catch(console.error);
  };

  // auto-fill address by CEP
  useEffect(() => {
    const raw = cep.replace(/\D/g, "");
    if (CEP_RE.test(raw)) {
      setLoadingCep(true);
      fetch(`https://brasilapi.com.br/api/cep/v2/${raw}`)
        .then(res => res.json())
        .then(data => {
          setAddress(data.street);
          setCity(data.city);
          setState(data.state);
        })
        .catch(() => {})
        .finally(() => setLoadingCep(false));
    }
  }, [cep]);

  function calculateAge(dateStr: string): number {
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const validateField = (field: string, value: string) => {
  let msg = ""
  const raw = value.replace(/\D/g, "")
  const v = value.trim()

  switch (field) {
    case "cpf":
      if (!raw) msg = "CPF é obrigatório."
      else if (!validarCPF(raw)) msg = "CPF inválido."
      break

    case "name":
      msg = getNomeError(value)
      break

    case "email":
      msg = getEmailError(value)
      break

    case "phone":
      msg = getTelefoneError(value)
      break

    case "birthDate":
      if (!v) msg = "Data de nascimento é obrigatória."
      else if (!isPastOrToday(v)) msg = "Data não pode ser futura."
      else {
        const age = calculateAge(v)
        if (age < 0) msg = "Data inválida."
        else if (age < 18) msg = "Idade mínima de 18 anos."
        else if (age > 120) msg = "Idade não pode exceder 120 anos."
      }
      break

    case "cep":
      if (!raw) msg = "CEP é obrigatório."
      else if (!/^\d{8}$/.test(raw)) msg = "CEP deve ter 8 dígitos."
      break

    case "address":
      if (!v) msg = "Endereço é obrigatório."
      else if (v.length < 3) msg = "Endereço muito curto."
      else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s\.]+$/.test(v))
        msg = "Somente letras, números, espaços e pontos."
      else if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(v))
        msg = "Endereço deve conter ao menos uma letra."
      else if (
        !/^(Rua|R\.|Avenida|Av\.|Travessa|Tv\.|Praça|Alameda|Rodovia|Estrada|Via)\b/i.test(
          v
        )
      )
        msg = "Deve começar com logradouro válido (Rua, Av, etc.)."
      break

    case "number":
      if (!v) msg = "Número é obrigatório."
      else if (!/^\d+$/.test(v)) msg = "Número só pode conter dígitos."
      break

    case "city":
      if (v && !/^[A-Za-zÀ-ÖØ-öø-ÿ ]{2,}$/.test(v))
        msg = "Cidade só letras e ≥2 caracteres."
      break

    case "state":
      if (v && !UF_SET.has(v.toUpperCase())) msg = "UF inválida."
      break

    case "gender":
      if (!v) msg = "Gênero é obrigatório."
      break
  }

  setErrors(prev => ({ ...prev, [field]: msg }))
}

  const handleChange = (
    field: string,
    setter: (v: string) => void,
    formatter?: (v: string) => string
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    setter(formatter ? raw.replace(/\D/g, "") : raw);
    validateField(field, formatter ? raw.replace(/\D/g, "") : raw);
  };

  // submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ["cpf","name","birthDate","email","phone","cep","number","state","gender","address"].forEach(f =>
      validateField(f, ({ cpf,name,email,phone,cep,number,state,birthDate,gender, address} as any)[f])
    );
    if (Object.values(errors).some(x => x)) return;
    const payload = {
      pac_cpf: cpf,
      pac_nome: name,
      pac_email: email,
      pac_telefone: phone,
      pac_data_nascimento: birthDate,
      pac_genero: gender,
      pac_cep: cep,
      pac_endereco: `${address}, ${number}`,
      pac_cidade: city,
      pac_estado: state,
    };
    const url = dialogMode === "create"
      ? "/api/pacientes"
      : `/api/pacientes/${selectedPatientId}`;
    const method = dialogMode === "create" ? "POST" : "PUT";
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(() => {
        setDialogOpen(false);
        clearForm();
        fetchPatients();
      })
      .catch(() => alert("Erro ao salvar paciente"));
  };

  const isFormValid =
    cpf && name && birthDate && gender && cep && number && address
    !Object.values(errors).some(x => x);

  return (
    <>
      <Header>
        <TopNav links={topNavLinks} />
        <div className="ml-auto flex items-center space-x-4">
          <ProfileDropdown />
        </div>
      </Header>

      <main className="p-4 space-y-6">
        <h1 className="text-3xl font-bold">Lista de Pacientes</h1>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-48"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </select>
          <Button onClick={openCreateDialog}>Cadastrar Paciente</Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Pacientes Cadastrados</CardTitle>
            <CardDescription>
              {statusFilter === "all"
                ? `Total: ${patients.length}`
                : statusFilter === "active"
                ? `Ativos: ${patients.filter(p => p.pac_ativo).length}`
                : `Inativos: ${patients.filter(p => !p.pac_ativo).length}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px]">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Nascimento</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Cidade/Estado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients
                    .filter(p => {
                      if (statusFilter === "all") return true;
                      return statusFilter === "active"
                        ? p.pac_ativo
                        : !p.pac_ativo;
                    })
                    .filter(p =>
                      p.pac_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.pac_cpf.includes(searchTerm.replace(/\D/g, ""))
                    )
                    .map(p => (
                      <TableRow
                        key={p.id_paciente}
                        className={!p.pac_ativo ? "bg-gray-100" : ""}
                      >
                        <TableCell>{p.pac_nome}</TableCell>
                        <TableCell>{formatCPF(p.pac_cpf)}</TableCell>
                        <TableCell>
                          {new Date(p.pac_data_nascimento)
                            .toISOString()
                            .slice(0, 10)
                            .split("-")
                            .reverse()
                            .join("/")}
                        </TableCell>
                        <TableCell>{p.pac_email}</TableCell>
                        <TableCell>{formatPhone(p.pac_telefone)}</TableCell>
                        <TableCell>{p.pac_endereco}</TableCell>
                        <TableCell>
                          {p.pac_cidade} / {p.pac_estado}
                        </TableCell>
                        <TableCell>
                          {p.pac_ativo ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(p.id_paciente)}
                              >
                                Editar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openDeleteAlert(p)}
                                  >
                                    Inativar
                                  </Button>
                                </AlertDialogTrigger>
                              </AlertDialog>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReactivate(p.id_paciente)}
                            >
                              Reativar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  {patients.filter(p => {
                    if (statusFilter === "all") return true;
                    return statusFilter === "active" ? p.pac_ativo : !p.pac_ativo;
                  }).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-4 text-center">
                        Nenhum paciente encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableCaption className="text-sm text-muted-foreground mt-2">
                  Total de{" "}
                  {
                    patients.filter(p =>
                      statusFilter === "all"
                        ? true
                        : statusFilter === "active"
                        ? p.pac_ativo
                        : !p.pac_ativo
                    ).length
                  }{" "}
                  paciente(s).
                </TableCaption>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[800px] w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Cadastrar Paciente" : "Editar Paciente"}
            </DialogTitle>
            <DialogDescription>Preencha os campos obrigatórios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1">
                <Label>CPF *</Label>
                <Input
                  value={formatCPF(cpf)}
                  onChange={handleChange("cpf", setCpf, formatCPF)}
                />
                {errors.cpf && <p className="text-red-600 text-sm">{errors.cpf}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <Label>Nome *</Label>
                <Input value={name} onChange={handleChange("name", setName)} />
                {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <Label>E-mail</Label>
                <Input value={email} onChange={handleChange("email", setEmail)} />
                {errors.email && <p className="text-red-600 text-sm">{errors.email}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <Label>Telefone *</Label>
                <Input
                  value={formatPhone(phone)}
                  onChange={handleChange("phone", setPhone, formatPhone)}
                />
                {errors.phone && <p className="text-red-600 text-sm">{errors.phone}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <Label>Data de Nascimento *</Label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={handleChange("birthDate", setBirthDate)}
                />
                {errors.birthDate && <p className="text-red-600 text-sm">{errors.birthDate}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <Label>Gênero *</Label>
                <select
                  value={gender}
                  onChange={handleChange("gender", setGender)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
                {errors.gender && <p className="text-red-600 text-sm">{errors.gender}</p>}
              </div>

              <div className="flex flex-col gap-1 relative">
                <Label>CEP *</Label>
                <Input
                  value={formatCep(cep)}
                  onChange={handleChange("cep", setCep, formatCep)}
                />
                {loadingCep && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                )}
                {errors.cep && <p className="text-red-600 text-sm">{errors.cep}</p>}
              </div>

              <div className="flex flex-col gap-1">
  <Label>Endereço *</Label>
  <Input
    value={address}
    onChange={handleChange("address", setAddress)}
  />
  {errors.address && (
    <p className="text-red-600 text-sm">{errors.address}</p>
  )}
</div>

              <div className="flex flex-col gap-1">
                <Label>Número *</Label>
                <Input value={number} onChange={handleChange("number", setNumber)} />
                {errors.number && <p className="text-red-600 text-sm">{errors.number}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <Label>Cidade</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1">
                <Label>Estado</Label>
                <Input value={state} onChange={handleChange("state", setState)} />
                {errors.state && <p className="text-red-600 text-sm">{errors.state}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={!isFormValid}>
                {dialogMode === "create" ? "Cadastrar" : "Salvar"}
              </Button>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar Paciente?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PacientesPage;
