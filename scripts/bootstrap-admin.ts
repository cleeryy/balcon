/**
 * Bootstrap du premier admin (server-only, exécuté depuis docker-entrypoint.sh
 * APRÈS `prisma migrate deploy`).
 *
 * - Si aucun utilisateur n'existe : crée l'admin depuis ADMIN_EMAIL +
 *   ADMIN_PASSWORD (+ ADMIN_NAME optionnel) via le stockage Better Auth
 *   (hash scrypt via ctx.password.hash + internalAdapter, comme
 *   l'endpoint admin create-user). Échoue fermé (exit 1, message clair)
 *   si les variables manquent — jamais de skip silencieux.
 * - Si des utilisateurs existent : ne fait rien (idempotent, jamais de reset).
 * - Puis rattache les Watch orphelines (ownerId IS NULL) au premier admin
 *   (ou au plus ancien utilisateur en repli).
 *
 * Ne loggue JAMAIS de secret.
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function fail(message: string): never {
  console.error(`[bootstrap] FATAL: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (!process.env.BETTER_AUTH_SECRET) {
    fail("BETTER_AUTH_SECRET manquant (requis pour le hashing/token).");
  }

  const userCount = await prisma.user.count();

  if (userCount === 0) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME?.trim() || "Admin";
    if (!email || !password) {
      fail(
        "aucun utilisateur en base et ADMIN_EMAIL / ADMIN_PASSWORD manquants — " +
          "définissez ces variables pour créer le premier admin (aucun compte créé)."
      );
    }
    const ctx = await auth.$context;
    const existing = await ctx.internalAdapter.findUserByEmail(email as string);
    if (existing) {
      fail(`l'utilisateur ${email} existe déjà (concurrence ?) — rien n'a été modifié.`);
    }
    const user = await ctx.internalAdapter.createUser(
      { email: email as string, name, role: "admin", emailVerified: true },
      { method: "admin" }
    );
    if (!user) fail("échec de création de l'utilisateur admin.");
    const hashed = await ctx.password.hash(password as string);
    await ctx.internalAdapter.linkAccount({
      providerId: "credential",
      accountId: user.id,
      password: hashed,
      userId: user.id,
    });
    console.log(`[bootstrap] admin créé (${email}).`);
  } else {
    console.log(`[bootstrap] ${userCount} utilisateur(s) existant(s) — création ignorée (idempotent).`);
  }

  // Rattachement des orphelines au premier admin (repli : plus ancien utilisateur).
  const owner =
    (await prisma.user.findFirst({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } }));
  if (!owner) {
    console.log("[bootstrap] aucun utilisateur — aucune Watch à rattacher.");
    return;
  }
  const adopted = await prisma.watch.updateMany({
    where: { ownerId: null },
    data: { ownerId: owner.id },
  });
  console.log(`[bootstrap] ${adopted.count} watch(s) orpheline(s) rattachée(s).`);
}

main()
  .catch((e) => {
    console.error("[bootstrap] FATAL:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
