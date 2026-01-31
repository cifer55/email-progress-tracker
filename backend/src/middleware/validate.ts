import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { sanitizeObject } from '../utils/sanitization';

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitize request body before validation
    req.body = sanitizeObject(req.body);
    
    const { error } = schema.validate(req.body);

    if (error) {
      logger.warn('Request validation failed', { error: error.details });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d: any) => d.message),
      });
    }

    next();
  };
};

export const validateParams = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitize params before validation
    req.params = sanitizeObject(req.params);
    
    const { error } = schema.validate(req.params);

    if (error) {
      logger.warn('Params validation failed', { error: error.details });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d: any) => d.message),
      });
    }

    next();
  };
};

export const validateQuery = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitize query before validation
    req.query = sanitizeObject(req.query);
    
    const { error } = schema.validate(req.query);

    if (error) {
      logger.warn('Query validation failed', { error: error.details });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d: any) => d.message),
      });
    }

    next();
  };
};
