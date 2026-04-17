// Cannapass — Notification Edge Function
// Sends transactional emails via Resend for all platform events

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://cannapass.vercel.app';
const FROM = 'Cannapass <noreply@cannapass.vercel.app>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function emailBase(content: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fff;">
      <div style="text-align:center;margin-bottom:28px;">
        <h2 style="color:#16a34a;margin:0;font-size:22px;">Cannapass</h2>
        <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">Transporte Legal Verificável</p>
      </div>
      ${content}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px;">
      <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0;">
        Cannapass — Plataforma em conformidade com ANVISA RDC n.º 327/2019<br>
        Este e-mail foi gerado automaticamente, não responda.
      </p>
    </div>
  `;
}

function getEmailContent(type: string, name: string, extra: Record<string, string> = {}): { subject: string; html: string } | null {
  const btnStyle = 'display:inline-block;padding:12px 28px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;margin-top:16px;';
  const appLink = `<a href="${APP_URL}" style="${btnStyle}">Acessar Cannapass</a>`;

  switch (type) {
    case 'approved':
      return {
        subject: 'Cannapass — Cadastro aprovado! ✓',
        html: emailBase(`
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Seu cadastro no Cannapass foi <strong style="color:#16a34a;">aprovado</strong>.</p>
          <p>Você já pode gerar seu QR Code de viagem e apresentá-lo aos agentes fiscalizadores durante o transporte de sua medicação.</p>
          <div style="text-align:center;">${appLink}</div>
        `),
      };
    case 'rejected':
      return {
        subject: 'Cannapass — Atualização sobre seu cadastro',
        html: emailBase(`
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Seu cadastro no Cannapass foi <strong style="color:#dc2626;">rejeitado</strong>.</p>
          ${extra.rejection_reason ? `<p><strong>Motivo:</strong> ${extra.rejection_reason}</p>` : ''}
          <p>Revise os documentos enviados e tente novamente. Se tiver dúvidas, entre em contato com o suporte.</p>
          <div style="text-align:center;">${appLink}</div>
        `),
      };
    case 'renewal_approved':
      return {
        subject: 'Cannapass — Renovação aprovada! ✓',
        html: emailBase(`
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Sua <strong>renovação de cadastro</strong> foi <strong style="color:#16a34a;">aprovada</strong>.</p>
          <p>Seu perfil está atualizado e você pode continuar gerando QR Codes de viagem normalmente.</p>
          <div style="text-align:center;">${appLink}</div>
        `),
      };
    case 'renewal_rejected':
      return {
        subject: 'Cannapass — Atualização sobre sua renovação',
        html: emailBase(`
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Sua <strong>renovação de cadastro</strong> foi <strong style="color:#dc2626;">rejeitada</strong>.</p>
          ${extra.rejection_reason ? `<p><strong>Motivo:</strong> ${extra.rejection_reason}</p>` : ''}
          <p>Acesse a plataforma para revisar e reenviar os documentos necessários.</p>
          <div style="text-align:center;">${appLink}</div>
        `),
      };
    case 'agent_approved':
      return {
        subject: 'Cannapass — Acesso de Agente aprovado! ✓',
        html: emailBase(`
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Seu cadastro como <strong>Agente Fiscalizador</strong> no Cannapass foi <strong style="color:#16a34a;">aprovado</strong>.</p>
          <p>Você já tem acesso ao portal do agente para escanear e verificar QR Codes de pacientes durante fiscalizações de transporte.</p>
          <div style="text-align:center;">${appLink}</div>
        `),
      };
    case 'agent_rejected':
      return {
        subject: 'Cannapass — Atualização sobre seu cadastro de Agente',
        html: emailBase(`
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Seu cadastro como <strong>Agente Fiscalizador</strong> no Cannapass foi <strong style="color:#dc2626;">rejeitado</strong>.</p>
          <p>Entre em contato com o administrador da plataforma para mais informações.</p>
          <div style="text-align:center;">${appLink}</div>
        `),
      };
    case 'expiring_soon':
      return {
        subject: 'Cannapass — Documentos prestes a vencer',
        html: emailBase(`
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Seus documentos no Cannapass estão <strong style="color:#d97706;">prestes a vencer</strong>.</p>
          <p>Renove sua documentação para continuar gerando QR Codes de viagem sem interrupções.</p>
          <div style="text-align:center;">${appLink}</div>
        `),
      };
    default:
      return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, patient_email, patient_name, ...extra } = body;

    if (!type || !patient_email || !patient_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: type, patient_email, patient_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailContent = getEmailContent(type, patient_name, extra);
    if (!emailContent) {
      return new Response(JSON.stringify({ error: `Unknown notification type: ${type}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [patient_email],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[send-notification] Resend error:', errText);
      return new Response(JSON.stringify({ error: 'Email delivery failed', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, type }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[send-notification] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
