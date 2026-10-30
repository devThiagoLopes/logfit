CREATE TABLE "dispositivo" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"local" text,
	"token" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dispositivo_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "checkin" (
	"id" text PRIMARY KEY NOT NULL,
	"dispositivo_id" text NOT NULL,
	"aluno_id" text,
	"identificador_tipo" text NOT NULL,
	"identificador_valor" text NOT NULL,
	"liberado" boolean NOT NULL,
	"motivo" text,
	"sentido" text,
	"ocorrido_em" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkin" ADD CONSTRAINT "checkin_dispositivo_id_dispositivo_id_fk" FOREIGN KEY ("dispositivo_id") REFERENCES "public"."dispositivo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin" ADD CONSTRAINT "checkin_aluno_id_aluno_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."aluno"("id") ON DELETE set null ON UPDATE no action;