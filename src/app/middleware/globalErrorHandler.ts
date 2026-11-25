import { NextFunction, Request, Response } from "express";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let message = err.message || "Something went wrong";
  let statusCode = err.statusCode || 500;
  const errorDetails: any = [];
  console.log(err.message, err);

  // 1. JWT Errors (Invalid signature, malformed, expired)
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    if (err.message === "invalid signature") {
      message = "Invalid token signature. Your session is invalid or has been tampered with. Please log in again.";
    } else if (err.message === "jwt malformed") {
      message = "Malformed authorization token. Please provide a valid token.";
    } else {
      message = "Invalid authorization token. Please log in again.";
    }
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your login session has expired. Please log in again to continue.";
  }

  // 2. Multer File Upload Errors
  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "The uploaded file exceeds the maximum allowed size limit. Please choose a smaller file.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = `Unexpected upload field '${err.field}'. Please verify the required form-data field name (e.g. 'image' or 'audio').`;
    } else {
      message = `Upload error: ${err.message}`;
    }
    errorDetails.push({
      path: err.field || "file",
      message,
    });
  }

  // 3. Zod Validation Errors
  if (err.name === "ZodError") {
    message = err.issues?.[0]?.message || "Validation error";
    statusCode = 400;

    err.issues?.forEach((error: any) => {
      const fieldPath = error.path?.[error.path.length - 1] || error.path?.join(".") || "field";
      errorDetails.push({ path: fieldPath, message: error.message });
    });
  }

  // 4. Prisma Validation Errors
  if (err.name === "PrismaClientValidationError") {
    message = "Invalid data provided";
    statusCode = 400;
    const errorMessage = err.message;

    // field extract
    const match = errorMessage.match(/Argument `(.*?)` is missing/);

    if (match) {
      message = `${match[1]} is required`;
      errorDetails.push({
        path: match[1],
        message: `${match[1]} is required`,
      });
    } else {
      errorDetails.push({
        path: "",
        message: "Invalid data format provided to database",
      });
    }
  }

  // 5. Prisma Known Request Errors (e.g. P2002 unique constraint)
  if (err.name === "PrismaClientKnownRequestError" || err.code?.startsWith?.("P2")) {
    statusCode = 400;

    if (err.code === "P2002") {
      const rawTarget = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : (err.meta?.target as string) ?? "field";
      const target = rawTarget.replace(/_/g, " ");
      message = `An account or record with this ${target} already exists.`;
      errorDetails.push({
        path: rawTarget,
        message: `Duplicate value for unique field: ${rawTarget}`,
      });
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = "The requested record was not found.";
    } else {
      message = "A database error occurred. Please try again.";
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode: err.errorCode || undefined,
    errorDetails: errorDetails.length > 0 ? errorDetails : err.details || undefined,
  });
};
