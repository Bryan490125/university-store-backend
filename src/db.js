let prisma;
if (process.env.NODE_ENV === "test") {
  prisma = {};
} else {
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
}
module.exports = prisma;
