// ניהול מחזור חיי המשחק — יצירה, הצטרפות, עדכון סטטוס, פיד והיסטוריה
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import gameService from '../services/game.service.js';

const gameController = {
  async createGame(req, res) {
    try {
      const userId = req.user.id;
      const { title, description, moderatorId } = req.body;

      if (!title) {
        return res.status(400).json({
          error: 'חסר שדה חובה: title',
        });
      }

      const game = await gameService.createGame(userId, {
        title,
        description,
        moderatorId,
      });

      res.status(201).json({ message: 'המשחק נוצר בהצלחה', game });
    } catch (error) {
      console.error('Create Game Error:', error);

      // שגיאת מפתח זר ב-Prisma (P2003)
      if (error.code === 'P2003') {
        const fieldName = error.meta?.field_name || '';

        if (fieldName.includes('moderator_id')) {
          return res
            .status(404)
            .json({ error: 'המשתמש שצוין כמנחה (moderatorId) לא נמצא במערכת' });
        }
      }

      res.status(500).json({ error: 'שגיאה ביצירת המשחק' });
    }
  },

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      let statusValue = req.body.status || req.body.newStatus;
      const userId = req.user.id;

      const validStatuses = ['WAITING', 'ACTIVE', 'FINISHED'];

      if (statusValue) statusValue = statusValue.trim().toUpperCase();

      if (!statusValue || !validStatuses.includes(statusValue)) {
        return res.status(400).json({
          error: `סטטוס לא תקין. ערכים מותרים: ${validStatuses.join(', ')}`,
        });
      }

      const updatedGame = await gameService.updateGameStatus(
        id,
        userId,
        statusValue
      );

      const io = req.app.get('io');
      if (io) {
        io.emit('game_status_update', {
          gameId: id,
          status: statusValue,
        });
        console.log(
          ` Broadcasted status update for game ${id}: ${statusValue}`
        );
      }
      res.status(200).json({ message: 'סטטוס המשחק עודכן', game: updatedGame });
    } catch (error) {
      console.error('Update Status Error:', error);
      res.status(500).json({ error: 'שגיאה בעדכון הסטטוס' });
    }
  },

  async joinGame(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { role } = req.body;
      const validRoles = ['PLAYER', 'VIEWER', 'MODERATOR', 'HOST', 'LIVE'];
      const assignedRole = role && validRoles.includes(role) ? role : 'PLAYER';

      const result = await gameService.joinGame(id, userId, assignedRole);

      if (result.alreadyJoined) {
        return res.status(200).json({
          message: 'המשתמש כבר רשום למשחק זה',
          participant: result.participant,
        });
      }

      res.status(201).json({
        message: 'הצטרפת למשחק בהצלחה!',
        participant: result.participant,
      });
    } catch (error) {
      console.error('Join Game Error:', error);

      if (error.message === 'Game not found') {
        return res.status(404).json({ error: 'המשחק לא נמצא' });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({ error: error.message });
      }
      if (
        error.message.includes('Conflict') ||
        error.message.includes('already playing') ||
        error.message.includes('already has a HOST')
      ) {
        return res.status(409).json({ error: error.message });
      }

      if (error.message.includes('Cannot join')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'שגיאה בהצטרפות למשחק' });
    }
  },

  async getFeed(req, res) {
    try {
      const userId = req.user.id;
      const feed = await gameService.getFollowedFeed(userId);
      res.status(200).json({ success: true, data: feed });
    } catch (error) {
      console.error('Feed Error:', error);
      res.status(500).json({ error: 'שגיאה בטעינת הפיד' });
    }
  },
  async getHistory(req, res) {
    try {
      const userId = req.user.id;
      const data = await gameService.getGameHistory(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async togglePin(req, res) {
    try {
      const userId = req.user.id;
      const { gameId } = req.params;
      const data = await gameService.togglePin(userId, gameId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      if (error.message === 'Activity not found') {
        return res.status(404).json({ error: 'המשחק לא נמצא בהיסטוריה' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async migrateActivities(req, res) {
    try {
      const participants = await prisma.gameParticipant.findMany({
        select: {
          userId: true,
          gameId: true,
          role: true,
          joinedAt: true,
        },
      });

      let created = 0;
      for (const p of participants) {
        await prisma.userGameActivity.upsert({
          where: {
            userId_gameId: { userId: p.userId, gameId: p.gameId },
          },
          update: {},
          create: {
            userId: p.userId,
            gameId: p.gameId,
            relationType: p.role,
            isPinned: false,
            isDeleted: false,
          },
        });
        created++;
      }

      res.json({ success: true, migrated: created });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  async getGameViewers(req, res) {
    try {
      const { gameId } = req.params;
      const userId = req.user.id;
      const data = await gameService.getGameViewers(gameId, userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async seedViewLogs(req, res) {
    try {
      await prisma.viewLog.createMany({
        data: [
          {
            userId: '36d7c267-0e50-42f5-b3c9-7e057d57bb0b',
            hostId: '36d7c267-0e50-42f5-b3c9-7e057d57bb0b',
            gameId: '550572a6-d66b-4a2e-8050-a9c2fba8f498',
            duration: 120,
          },
          {
            userId: 'c50dd91e-8412-4120-a9a3-a3c1b34ca00b',
            hostId: '36d7c267-0e50-42f5-b3c9-7e057d57bb0b',
            gameId: '550572a6-d66b-4a2e-8050-a9c2fba8f498',
            duration: 60,
          },
        ],
      });

      res.json({ success: true, message: 'נתוני בדיקה נוצרו' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default gameController;
