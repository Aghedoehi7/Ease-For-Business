import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});

async function main() {
  const product = await prisma.product.create({
    data: { name: "Sample Item", price: 10.5, quantity: 5 }
  });
  console.log(product);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
