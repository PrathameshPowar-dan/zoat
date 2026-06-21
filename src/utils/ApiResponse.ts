class ApiResponse {
    public readonly statusCode: number;
    public readonly data: unknown;
    public readonly message: string;
    public readonly success: boolean;

    constructor(statusCode: number, data: unknown, message: string = "Success") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
    }
}

export { ApiResponse };