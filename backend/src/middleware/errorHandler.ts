import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

function databaseError(err: Error): { statusCode: number; message: string } | null {
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    /can't reach database server/i.test(err.message)
  ) {
    return { statusCode: 503, message: 'The database is unavailable. Try again in a moment.' };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return { statusCode: 409, message: 'That value is already in use.' };
    if (err.code === 'P2025') return { statusCode: 404, message: 'The record was not found.' };
    return { statusCode: 500, message: 'The database request could not be completed.' };
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    return { statusCode: 500, message: 'The database request could not be completed.' };
  }
  return null;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Operational AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        details: err.details,
      },
    });
    return;
  }

  // Zod Validation Error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // SyntaxError from invalid JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Malformed JSON payload',
        statusCode: 400,
      },
    });
    return;
  }

  const database = databaseError(err);
  if (database) {
    console.error('Database error:', err);
    res.status(database.statusCode).json({
      success: false,
      error: { message: database.message, statusCode: database.statusCode },
    });
    return;
  }

  console.error('💥 Unhandled Exception:', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Something went wrong. Please try again.',
      statusCode: 500,
    },
  });
}
