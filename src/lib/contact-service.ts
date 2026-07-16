import { isSupabaseConfigured, supabase } from "./supabase";

export interface ContactMessageInput {
  nombre: string;
  correo: string;
  asunto: string;
  mensaje: string;
  website?: string;
}

export type ContactDelivery = "stored" | "email-client";

function openEmailClient(input: ContactMessageInput): void {
  const subject = encodeURIComponent(`[Web Delegación IEK] ${input.asunto}`);
  const body = encodeURIComponent(
    `Nombre: ${input.nombre}\nCorreo de contacto: ${input.correo}\n\n${input.mensaje}`,
  );
  window.location.assign(`mailto:delegacioniek@gmail.com?subject=${subject}&body=${body}`);
}

export async function submitContactMessage(input: ContactMessageInput): Promise<ContactDelivery> {
  if (!isSupabaseConfigured || !supabase) {
    openEmailClient(input);
    return "email-client";
  }

  const { error } = await supabase.rpc("submit_contact_message", {
    p_name: input.nombre,
    p_email: input.correo,
    p_subject: input.asunto,
    p_message: input.mensaje,
    p_website: input.website || "",
  });

  if (!error) return "stored";

  const missingFunction =
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.message.toLowerCase().includes("submit_contact_message");
  if (missingFunction) {
    openEmailClient(input);
    return "email-client";
  }
  throw error;
}
