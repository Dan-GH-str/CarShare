import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, message } = this.mapPrismaError(exception);

    if (statusCode >= 500) {
      console.error('[PrismaException]', {
        code: exception.code,
        message: exception.message,
        meta: exception.meta,
      });
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: statusCode >= 500 ? 'Database error' : 'Bad Request',
    });
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Такая запись уже существует. Проверьте уникальные поля.',
      };
    }

    if (exception.code === 'P2021' || exception.code === 'P2022') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Сервис временно недоступен. Попробуйте повторить запрос позднее.',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка базы данных. Проверьте логи backend.',
    };
  }
}
