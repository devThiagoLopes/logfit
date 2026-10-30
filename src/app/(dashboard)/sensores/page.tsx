import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Radio } from "lucide-react";

import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/permissions";
import { DispositivoAtivoToggle } from "@/components/sensores/dispositivo-ativo-toggle";
import { DispositivoFormDialog } from "@/components/sensores/dispositivo-form-dialog";
import { DispositivoRowActions } from "@/components/sensores/dispositivo-row-actions";
import { DispositivoTokenCell } from "@/components/sensores/dispositivo-token-cell";
import { getDispositivos } from "@/services/dispositivos";

export default async function ConfiguracoesSensoresPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!hasRole(session?.user, ["admin"])) {
    redirect("/");
  }

  const dispositivos = await getDispositivos();

  return (
    <div className="px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Sensores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catracas e dispositivos de check-in. Cada dispositivo usa um
            token próprio para se autenticar nas rotas de autorização de
            acesso.
          </p>
        </div>

        <DispositivoFormDialog />
      </div>

      {dispositivos.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Radio className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Nenhum dispositivo cadastrado ainda
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Clique em &quot;Novo dispositivo&quot; para cadastrar a primeira
            catraca/sensor.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Local</th>
                <th className="px-4 py-3 font-medium">Token</th>
                <th className="px-4 py-3 font-medium">Ativo</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dispositivos.map((dispositivo) => (
                <tr key={dispositivo.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {dispositivo.nome}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dispositivo.local ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <DispositivoTokenCell
                      dispositivoId={dispositivo.id}
                      token={dispositivo.token}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DispositivoAtivoToggle
                      dispositivoId={dispositivo.id}
                      ativo={dispositivo.ativo}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DispositivoRowActions dispositivo={dispositivo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
