CREATE TABLE "channel_routes" (
	"channel_id" text NOT NULL,
	"platform" smallint NOT NULL,
	"connection_id" text NOT NULL,
	"profile_id" text NOT NULL,
	CONSTRAINT "channel_routes_channel_id_platform_pk" PRIMARY KEY("channel_id","platform")
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"niche" text NOT NULL,
	"stage" text DEFAULT 'Bibit' NOT NULL,
	"format" text DEFAULT 'Faceless' NOT NULL,
	"hypothesis" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"caption_template" text DEFAULT '' NOT NULL,
	"hashtags" text[] DEFAULT '{}' NOT NULL,
	"day_total" integer DEFAULT 30 NOT NULL,
	"vids_total" integer DEFAULT 30 NOT NULL,
	"target_metric" text DEFAULT 'Median views/post' NOT NULL,
	"target_value" real DEFAULT 1000 NOT NULL,
	"cost_per_month" integer DEFAULT 0 NOT NULL,
	"per_day" smallint DEFAULT 1 NOT NULL,
	"schedule_mode" text DEFAULT 'auto' NOT NULL,
	"manual_slots" text[] DEFAULT '{}' NOT NULL,
	"storage_connection_id" text,
	"auto" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"secret_enc" text NOT NULL,
	"key_hint" text NOT NULL,
	"cloud_name" text,
	"status" text DEFAULT 'untested' NOT NULL,
	"error" text,
	"tested_at" timestamp with time zone,
	"usage_used" real,
	"usage_limit" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linked_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"external_id" text NOT NULL,
	"platform" smallint NOT NULL,
	"handle" text NOT NULL,
	"missing" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_routes" ADD CONSTRAINT "channel_routes_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_routes" ADD CONSTRAINT "channel_routes_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_routes" ADD CONSTRAINT "channel_routes_profile_id_linked_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."linked_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_storage_connection_id_connections_id_fk" FOREIGN KEY ("storage_connection_id") REFERENCES "public"."connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_profiles" ADD CONSTRAINT "linked_profiles_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "linked_profiles_conn_ext" ON "linked_profiles" USING btree ("connection_id","external_id");