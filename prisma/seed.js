require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo123!", 12);
  const users = [
    ["Student Demo", "student@university.edu", "STUDENT"],
    ["Staff Demo", "staff@university.edu", "STAFF"],
    ["Admin Demo", "admin@university.edu", "ADMIN"]
  ];
  for (const [name, email, role] of users) {
    await prisma.user.upsert({ where: { email }, update: {}, create: { name, email, role, passwordHash } });
  }
  const category = await prisma.category.upsert({ where: { name: "Apparel" }, update: {}, create: { name: "Apparel" } });
  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "University Hoodie", description: "Comfortable official university hoodie.", price: 899, stock: 50, categoryId: category.id }
  });
  console.log("Seed complete. Demo password for all users: Demo123!");
}
main().finally(() => prisma.$disconnect());
