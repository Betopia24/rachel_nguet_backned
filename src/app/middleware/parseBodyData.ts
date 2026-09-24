import { NextFunction, Request, Response } from "express";

/**
 * Middleware to parse stringified JSON in form-data fields (e.g. req.body.data)
 * into req.body so both flat form-data and nested JSON payloads are supported.
 */
export const parseBodyData = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body?.data && typeof req.body.data === "string") {
    try {
      const parsed = JSON.parse(req.body.data);
      if (typeof parsed === "object" && parsed !== null) {
        req.body = { ...req.body, ...parsed };
      }
    } catch (err) {
      // Keep original body if not valid JSON
    }
  }
  next();
};
