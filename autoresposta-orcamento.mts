function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function text(value: unknown): string {
  return String(value ?? "").trim()
}

export default {
  async formSubmitted(event: any) {
    const data = event?.data ?? {}

    // Só processa o formulário de orçamento e ignora o honeypot anti-spam.
    const formName = text(data["form-name"] || data.form_name || data.formName)
    if (formName && formName !== "orcamento") return
    if (text(data["empresa-site"])) return

    const nome = text(data.nome)
    const email = text(data.email)
    const cidade = text(data.cidade)
    const servico = text(data.servico)

    if (!email || !email.includes("@")) {
      console.log("Autoresposta ignorada: e-mail do cliente ausente ou inválido.")
      return
    }

    const apiKey = Netlify.env.get("BREVO_API_KEY")
    if (!apiKey) {
      throw new Error("BREVO_API_KEY não configurada no Netlify.")
    }

    const primeiroNome = nome ? nome.split(/\s+/)[0] : "cliente"
    const detalhes = [
      servico ? `<p style="margin:0 0 6px"><strong>Serviço:</strong> ${escapeHtml(servico)}</p>` : "",
      cidade ? `<p style="margin:0"><strong>Cidade:</strong> ${escapeHtml(cidade)}</p>` : "",
    ].filter(Boolean).join("")

    const htmlContent = `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#16243a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fa;padding:28px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7ebf0">
          <tr>
            <td style="padding:24px 28px;background:#0d3b66;color:#ffffff">
              <div style="font-size:22px;font-weight:700">DF TOPOGRAFIA</div>
              <div style="font-size:13px;margin-top:4px;opacity:.9">Precisão em cada ponto</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px">
              <p style="font-size:18px;margin:0 0 16px">Olá, ${escapeHtml(primeiroNome)}.</p>
              <p style="font-size:16px;line-height:1.6;margin:0 0 18px">Recebemos sua solicitação de orçamento com sucesso.</p>
              <p style="font-size:16px;line-height:1.6;margin:0 0 20px">Nossa equipe analisará as informações enviadas e entrará em contato para dar continuidade ao atendimento.</p>
              ${detalhes ? `<div style="background:#f4f8fb;border-left:4px solid #2b7a3d;padding:14px 16px;margin:0 0 22px">${detalhes}</div>` : ""}
              <p style="font-size:15px;line-height:1.6;margin:0 0 4px"><strong>DF TOPOGRAFIA</strong></p>
              <p style="font-size:14px;line-height:1.6;margin:0">(18) 99128-8848<br>contato@dftopografiasp.com.br<br>dftopografiasp.com.br</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

    const textContent = [
      `Olá, ${primeiroNome}.`,
      "",
      "Recebemos sua solicitação de orçamento com sucesso.",
      "Nossa equipe analisará as informações enviadas e entrará em contato para dar continuidade ao atendimento.",
      "",
      servico ? `Serviço: ${servico}` : "",
      cidade ? `Cidade: ${cidade}` : "",
      "",
      "DF TOPOGRAFIA — Precisão em cada ponto",
      "(18) 99128-8848",
      "contato@dftopografiasp.com.br",
      "dftopografiasp.com.br",
    ].filter((line, index, arr) => line !== "" || arr[index - 1] !== "").join("\n")

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: "DF TOPOGRAFIA",
          email: "contato@dftopografiasp.com.br",
        },
        to: [{ email, name: nome || undefined }],
        replyTo: {
          name: "DF TOPOGRAFIA",
          email: "contato@dftopografiasp.com.br",
        },
        subject: "Recebemos sua solicitação de orçamento — DF Topografia",
        htmlContent,
        textContent,
      }),
    })

    if (!response.ok) {
      const details = await response.text()
      throw new Error(`Brevo retornou ${response.status}: ${details}`)
    }

    console.log(`Autoresposta enviada para ${email}.`)
  },
}
