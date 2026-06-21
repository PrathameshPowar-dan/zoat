class ApiError extends Error {
    public readonly statusCode: number;
    public readonly success: boolean = false;
    public readonly data: null = null;
    public readonly errors: unknown[];

    constructor(
        statusCode: number,
        message: string = "An error occurred",
        errors: unknown[] = [],
        stack?: string
    ) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };