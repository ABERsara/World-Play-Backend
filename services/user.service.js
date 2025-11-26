import prisma from '../config/prisma.js';

export const getAllUsers = async () => {
  return prisma.user.findMany();
};

export const createUser = async (data) => {
  return prisma.user.create({
    data,
  });
};
