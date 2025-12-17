import { z } from 'zod';

// סכמה ליצירת משחק
export const CreateGameSchema = z.object({
  roomName: z.string().min(3, "שם החדר חייב להכיל לפחות 3 תווים"),
  maxPlayers: z.number().min(2).max(8),
  isPrivate: z.boolean().optional()
});

// סכמה להצטרפות למשחק
export const JoinGameSchema = z.object({
  gameId: z.string().uuid("מזהה משחק לא תקין"), 
  role: z.enum(['PLAYER', 'VIEWER']).optional().default('VIEWER') // ולידציה גם על התפקיד
});
