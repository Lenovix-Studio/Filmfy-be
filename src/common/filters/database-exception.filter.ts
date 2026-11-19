import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    const message = exception?.message || '';
    const code = exception?.code;

    const isDbError =
      code === 'P1001' ||
      code === 'P1002' ||
      code === 'P1003' ||
      code === 'P1017' ||
      message.includes("Can't reach database server") ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('PrismaClientInitializationError') ||
      message.includes('Connection terminated') ||
      message.includes('connection error');

    if (isDbError) {
      return reply.status(HttpStatus.SERVICE_UNAVAILABLE).send({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'DatabaseUnavailable',
        message:
          'Database sedang mati atau tidak dapat dijangkau. Silakan periksa koneksi database server.',
      });
    }

    const status = exception?.getStatus
      ? exception.getStatus()
      : exception?.status || HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      typeof exception?.getResponse === 'function'
        ? exception.getResponse()
        : {
            statusCode: status,
            message: message || 'Internal server error',
          };

    return reply.status(status).send(errorResponse);
  }
}
