import { Request } from 'express';
import { RequestUser } from './request-user.type';

export type AuthenticatedRequest = Request & {
  user?: RequestUser;
};
