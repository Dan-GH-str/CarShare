import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.carCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
