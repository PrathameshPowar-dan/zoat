import { type Request, type Response, type NextFunction, type RequestHandler } from 'express';

const asyncHandler = (fn: RequestHandler): RequestHandler =>
    (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch((error) => next(error));
    }

export { asyncHandler };