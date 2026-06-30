const prisma = require('./src/config/db');

async function main() {
  const messages = await prisma.message.findMany({
    orderBy: { timestamp: 'desc' },
    take: 5
  });

  console.log("Recent messages:");
  for (const msg of messages) {
    console.log(`- ID: ${msg.id}\n  Role: ${msg.role}\n  Content: "${msg.content.substring(0, 60)}..."\n  SID: ${msg.waMessageId}\n  Status: ${msg.waStatus}\n  Time: ${msg.timestamp}\n`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
