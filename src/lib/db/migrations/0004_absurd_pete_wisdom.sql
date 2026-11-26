CREATE TABLE "documento_aluno" (
	"id" text PRIMARY KEY NOT NULL,
	"aluno_id" text NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"blob_url" text NOT NULL,
	"nome_arquivo" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamanho_bytes" integer NOT NULL,
	"criado_por_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documento_aluno" ADD CONSTRAINT "documento_aluno_aluno_id_aluno_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."aluno"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento_aluno" ADD CONSTRAINT "documento_aluno_criado_por_id_user_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;