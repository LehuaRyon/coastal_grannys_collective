import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.PROMOTE_EMAIL;
  if (!email) {
    console.error('Usage: PROMOTE_EMAIL=someone@example.com npm run db:promote');
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'admin' },
  });

  console.log(`✓ ${user.email} is now an admin (id: ${user.id})`);
}

main()
  .catch((e) => {
    if ((e as { code?: string }).code === 'P2025') {
      console.error(`No user found with email: ${process.env.PROMOTE_EMAIL}`);
      console.error('Register on the site first, then run this command.');
    } else {
      console.error(e);
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
