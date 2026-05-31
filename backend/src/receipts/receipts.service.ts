import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RequestUser } from '../common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(user: RequestUser, id: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: { booking: true },
    });

    if (!receipt) {
      throw new NotFoundException('Чек не найден');
    }

    if (user.role !== UserRole.ADMIN && receipt.booking.userId !== user.id) {
      throw new ForbiddenException('Нет доступа к этому чеку');
    }

    return receipt;
  }
}
