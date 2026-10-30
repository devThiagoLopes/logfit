"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Dispositivo = { id: string; nome: string };

export function CheckinFiltros({
  dispositivos,
}: {
  dispositivos: Dispositivo[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mt-6 flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label htmlFor="dispositivoId">Dispositivo</Label>
        <Select
          value={searchParams.get("dispositivoId") ?? "all"}
          onValueChange={(value) => setParam("dispositivoId", value ?? "all")}
        >
          <SelectTrigger id="dispositivoId" className="w-48">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {dispositivos.map((dispositivo) => (
              <SelectItem key={dispositivo.id} value={dispositivo.id}>
                {dispositivo.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="liberado">Resultado</Label>
        <Select
          value={searchParams.get("liberado") ?? "all"}
          onValueChange={(value) => setParam("liberado", value ?? "all")}
        >
          <SelectTrigger id="liberado" className="w-40">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Liberado</SelectItem>
            <SelectItem value="false">Negado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="data">Data</Label>
        <Input
          id="data"
          type="date"
          className="w-40"
          defaultValue={searchParams.get("data") ?? ""}
          onChange={(event) => setParam("data", event.target.value)}
        />
      </div>
    </div>
  );
}
