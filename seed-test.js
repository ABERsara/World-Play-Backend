import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
  console.log("--- מתחיל ליצור נתונים לבדיקה ---");

  // 1. יצירת משתמש פיקטיבי (Host)
  const user = await prisma.user.create({
    data: {
      username: "TestUser_" + Date.now(),
      email: "test" + Date.now() + "@example.com",
      role: "HOST"
    }
  });
  console.log("✅ נוצר משתמש (User ID):", user.id);

  // 2. יצירת שידור (Stream) - חובה כדי ליצור משחק
  const stream = await prisma.stream.create({
    data: {
      title: "Test Stream",
      hostId: user.id,
      status: "LIVE" // כדי שתוכלי לבדוק גם את ה-Feed!
    }
  });
  console.log("✅ נוצר שידור (Stream ID):", stream.id);

  // 3. יצירת משחק (Game)
  const game = await prisma.game.create({
    data: {
      title: "Test Game Trivia",
      hostId: user.id,
      streamId: stream.id
    }
  });
  console.log("✅ נוצר משחק (Game ID):", game.id);

  console.log("-----------------------------------------");
  console.log("👇 תעתיקי את הנתונים האלה ל-Postman 👇");
  console.log(`"userId": "${user.id}",`);
  console.log(`"gameId": "${game.id}"`);
  console.log("-----------------------------------------");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());