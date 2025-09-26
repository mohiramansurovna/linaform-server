import { Request, Response } from 'express';

export type AppRequest<T = any, P = any> = Request<{}, P, T>;
export type AppResponse<T = any> = Response<T>;
