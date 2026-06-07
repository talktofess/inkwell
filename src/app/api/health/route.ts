import { NextResponse } from "next/server";
import { isConfigured, db } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Lightweight wiring check. Returns connection/schema status only — never any
// manuscript data. Public (see middleware) so you can hit it without unlocking.
export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json(
      { ok: false, env: "missing", hint: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  }

  try {
    const { error } = await db().from("inkwell_projects").select("id").limit(1);

    if (!error) {
      return NextResponse.json({ ok: true, env: "ok", db: "connected", schema: "ready" });
    }
    if (error.code === "PGRST205") {
      return NextResponse.json(
        { ok: false, env: "ok", db: "connected", schema: "missing", hint: "Run supabase/schema.sql in the Supabase SQL editor." },
        { status: 503 }
      );
    }
    if (error.code === "42501") {
      return NextResponse.json(
        { ok: false, env: "ok", db: "connected", schema: "ungranted", hint: "service_role lacks table grants — re-run the GRANT section of schema.sql." },
        { status: 503 }
      );
    }
    if (error.message?.toLowerCase().includes("api key") || error.code === "PGRST301") {
      return NextResponse.json(
        { ok: false, env: "ok", db: "auth_failed", hint: "The SUPABASE_SERVICE_ROLE_KEY (secret key) is wrong or incomplete." },
        { status: 401 }
      );
    }
    return NextResponse.json({ ok: false, env: "ok", db: "error", code: error.code, hint: error.message }, { status: 503 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, env: "ok", db: "unreachable", hint: String((e as Error)?.message ?? e) },
      { status: 503 }
    );
  }
}
