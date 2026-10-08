import { prisma } from "../lib/prisma";

async function main() {
  const existing = await prisma.watch.count();
  if (existing > 0) {
    console.log(`seed: ${existing} watch(s) déjà présents, rien à faire.`);
    return;
  }
  await prisma.watch.create({
    data: {
      url: "https://example.com",
      title: "Exemple — example.com",
      intervalMin: 30,
    },
  });
  console.log("seed: 1 watch exemple créé (https://example.com).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
