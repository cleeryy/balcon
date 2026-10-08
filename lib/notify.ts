import nodemailer from "nodemailer";

interface WatchNotify {
  id: string;
  url: string;
  title?: string | null;
  webhookUrl?: string | null;
  email?: string | null;
}

function mailer() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function notifyChange(watch: WatchNotify, diffPreview: string): Promise<void> {
  const title = watch.title || watch.url;
  const jobs: Promise<unknown>[] = [];

  if (watch.webhookUrl) {
    jobs.push(
      fetch(watch.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: `🔔 balcon: changement détecté — ${title}`,
          url: watch.url,
          watchId: watch.id,
          diff: diffPreview,
        }),
      }).catch((e) => console.error("[notify] webhook failed", e))
    );
  }

  if (watch.email) {
    const t = mailer();
    if (t) {
      jobs.push(
        t
          .sendMail({
            from: process.env.SMTP_FROM ?? "balcon@localhost",
            to: watch.email,
            subject: `🔔 balcon: changement — ${title}`,
            text: `Changement détecté sur ${watch.url}\n\n${diffPreview}`,
          })
          .catch((e) => console.error("[notify] email failed", e))
      );
    } else {
      console.warn("[notify] SMTP_HOST manquant, email ignoré pour", watch.id);
    }
  }

  await Promise.allSettled(jobs);
}
