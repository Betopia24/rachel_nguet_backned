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

  if (err.name === "ZodError") {
    message = err.issues?.[0]?.message || "Validation error";
    statusCode = 400;

    err.issues?.forEach((error: any) => {
      const fieldPath = error.path?.[error.path.length - 1] || error.path?.join(".") || "field";
      errorDetails.push({ path: fieldPath, message: error.message });
    });
  }

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
        message: "Invalid data provided to database",
      });
    }
  }

  // Handle Prisma known request errors (e.g. P2002 unique constraint)
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
    errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
  });
};
