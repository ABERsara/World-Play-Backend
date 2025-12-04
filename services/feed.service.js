import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Service: שליפת רשימת שידורים חיים
 * אופציונלי: מקבל userId לסינונים עתידיים
 */
export const fetchActiveStreams = async (userId) => {
  
  const liveStreams = await prisma.stream.findMany({
    where: {
      status: 'LIVE' 
    },
    include: {
      host: true,  // פרטי המנחה
      games: true  // משחקים משויכים
    }
  });

  return liveStreams;
};