import { notFound } from "next/navigation";
import Image from "next/image";
import { Ban, CheckCircle2 } from "lucide-react";

import { AssinaturaForm } from "@/components/matriculas/assinatura-form";
import { PERIODICIDADES } from "@/constants/periodicidade";
import { getMatriculaByToken } from "@/services/matriculas";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatarEndereco(aluno: {
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}) {
  const partes = [
    [aluno.endereco, aluno.numero].filter(Boolean).join(", "),
    aluno.bairro,
    aluno.cidade && aluno.uf ? `${aluno.cidade} – ${aluno.uf}` : aluno.cidade,
    aluno.cep,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" — ") : "";
}

export default async function AssinarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const matricula = await getMatriculaByToken(token);

  if (!matricula) {
    notFound();
  }

  const { aluno, plano } = matricula;
  const periodicidadeContratada = PERIODICIDADES.find(
    ({ key }) => key === matricula.periodicidade,
  )!;

  const valorContratado = currencyFormatter.format(Number(plano.valor));
  const dataInicio = new Date(matricula.dataInicio);
  const diaVencimento = dataInicio.getDate();
  const endereco = formatarEndereco(aluno);
  const exigeContrato = matricula.periodicidade !== "diaria";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-right text-xs text-muted-foreground">
        WhatsApp (19) 3569-3999
      </p>
      <h1 className="text-center text-xl font-semibold text-foreground">
        {exigeContrato
          ? "CONTRATO DE PRESTAÇÃO DE SERVIÇO"
          : "FICHA DE MATRÍCULA"}
      </h1>

      {exigeContrato ? (
        <section className="mt-6 space-y-3 text-sm text-muted-foreground">
          <p>
            Pelo presente de prestação de serviço, a Academia Estação do
            Corpo, estabelecida a Rua Pinhal, nº 529 – Jd. Santo Antônio –
            Mogi Guaçu – SP, Inscrição Municipal n° 207616, por Juliana
            Fernandes, denomina contratada e do outro lado o Aluno,
            denominado contratante.
          </p>

          <p>
            Aluno: <span className="text-foreground">{aluno.nome}</span>
          </p>
          <p>Responsável: —</p>
          <p>
            RG: <span className="text-foreground">{aluno.rg || "—"}</span>{" "}
            CPF: <span className="text-foreground">{aluno.cpf}</span>
          </p>
          <p>
            Endereço:{" "}
            <span className="text-foreground">{endereco || "—"}</span>
          </p>
          <p>
            Celular: <span className="text-foreground">{aluno.telefone}</span>
          </p>
          <p>
            Data de início:{" "}
            <span className="text-foreground">
              {dateFormatter.format(dataInicio)}
            </span>{" "}
            Tipo de contrato:{" "}
            <span className="text-foreground">
              {periodicidadeContratada.label}
            </span>
          </p>

          <p>
            <strong>Cláusula 1ª:</strong> O aluno tem direito aos horários e
            datas estipuladas no ato da matrícula, devendo respeitá-los. O
            aluno poderá alterar seus horários durante o ano letivo desde que
            comunique antecipadamente o responsável. O aluno terá direito à
            reposição de aula, quando o professor estiver impossibilitado de
            dar aula, sendo substituído a critério da academia. O aluno não
            terá direito a reposição de aula, quando a falta for sua, sem
            exceção, e quando seus horários coincidirem com feriados e pontos
            facultativos.
          </p>
          <p>
            <strong>Cláusula 2ª:</strong> É de suma responsabilidade o aluno
            comunicar ao professor qualquer problema de saúde que lhe
            surpreende durante o período de frequência na academia, além
            disso, é de muita importância que o aluno traga um atestado
            médico, comunicando à academia seu estado de saúde.
          </p>
          <p>
            <strong>Cláusula 3ª:</strong> O aluno que desejar interromper com
            serviços oferecidos, deverá comunicar o responsável pela academia
            até o final do mês, ou seja, antes de vencer a próxima
            mensalidade, caso contrário, ficará responsável pelo pagamento do
            mês da comunicação. Em caso de abandono, o aluno ficará
            responsável pelo pagamento do(s) mês(es) atrasado(s) até que haja
            comunicação. A mensalidade paga não será devolvida em hipótese
            alguma.
          </p>
          <p>
            <strong>Cláusula 4ª:</strong> O valor da mensalidade é de R${" "}
            {valorContratado} com vencimento todo dia {diaVencimento} de cada
            mês e o tipo de contrato é {periodicidadeContratada.label}, com 5
            dias de carência, sendo que se contam sábados, domingos e
            feriados na carência. A mensalidade poderá ser reajustada de
            acordo com as normas vigentes no mercado, sendo os alunos
            responsáveis comunicados com antecedência dos motivos e dos
            novos valores.
          </p>
          <p>
            <strong>Cláusula 5ª:</strong> O aluno deverá pagar sua
            mensalidade em dia. Em caso de atraso, após 5 dias de
            vencimento, a mensalidade terá um acréscimo de 10% sobre o valor
            total e será cobrado R$ 0,20 por dia de atraso. Se o atraso
            perdurar por mais de 30 dias as aulas serão suspensas.
          </p>
          <p>
            <strong>Cláusula 6ª:</strong> O presente contrato tem duração
            indeterminada e poderá ser rescindido ou renovado a qualquer
            momento. Em caso de rescindi-lo será necessário:
          </p>
          <p>
            O presente aluno ou responsável deverá comparecer até a academia
            e assinar o termo de desistência.
          </p>
          <p>
            Em caso de inadimplência o aluno será desligado automaticamente.
          </p>
          <p>
            <strong>Cláusula 7ª:</strong> A direção encontra-se a disposição
            do aluno ou responsável, sempre que surgirem duvidas ou por
            problemas relativos às atividades físicas existentes neste
            estabelecimento.
          </p>
          <p>
            E por estarem justos e contratados, assinam o presente
            instrumento em duas vias de igual teor, o CONTRATANTE e o
            CONTRATADO, para que se produzam os efeitos legais.
          </p>
          <p className="pt-2 text-xs">DIREÇÃO – Juliana F. Lopes</p>
        </section>
      ) : (
        <section className="mt-6 space-y-3 rounded-xl border border-border p-4 text-sm text-muted-foreground">
          <p>
            Aluno: <span className="text-foreground">{aluno.nome}</span>
          </p>
          <p>
            CPF: <span className="text-foreground">{aluno.cpf}</span>
          </p>
          <p>
            Data:{" "}
            <span className="text-foreground">
              {dateFormatter.format(dataInicio)}
            </span>{" "}
            · Valor: <span className="text-foreground">R$ {valorContratado}</span>{" "}
            · Diária
          </p>
        </section>
      )}

      <section className="mt-6 space-y-3 rounded-xl border border-border p-4">
        <h2 className="text-sm font-medium text-foreground">
          Questionário de saúde
        </h2>
        <ul className="divide-y divide-border">
          {matricula.anamnese.map((item, index) => (
            <li key={index} className="space-y-1 py-2 text-sm first:pt-0">
              <p className="text-foreground">
                {index + 1}. {item.pergunta}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                Resposta: {item.resposta ? "Sim" : "Não"}
              </p>
              {item.justificativa && (
                <p className="text-xs text-muted-foreground">
                  Justificativa: {item.justificativa}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        {matricula.status === "assinada" ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <p className="text-base font-semibold text-emerald-900">
              Este documento já foi assinado
            </p>
            <p className="text-sm text-emerald-800">
              Assinado por {matricula.assinaturaNome}
              {matricula.assinadoEm
                ? ` em ${dateTimeFormatter.format(new Date(matricula.assinadoEm))}`
                : ""}
            </p>
            {matricula.assinaturaImagem && (
              <div className="relative h-24 w-48 rounded-md border border-emerald-200 bg-white p-2">
                <Image
                  src={matricula.assinaturaImagem}
                  alt={`Assinatura de ${matricula.assinaturaNome}`}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            )}
          </div>
        ) : matricula.status === "cancelada" ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <Ban className="h-10 w-10 text-slate-500" />
            <p className="text-base font-semibold text-slate-800">
              Esta matrícula foi cancelada
            </p>
            <p className="text-sm text-slate-600">
              Procure a recepção da academia para mais informações.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border p-4">
            <h2 className="mb-4 text-sm font-medium text-foreground">
              Painel de assinatura digital
            </h2>
            <AssinaturaForm token={token} nomeSugerido={aluno.nome} />
          </div>
        )}
      </section>
    </div>
  );
}
