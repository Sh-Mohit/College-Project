class ApiResponse {
    constructor(statusCode, data, message = ""){
        this.statusCode = statusCode
        this.message = "Test passed"
        this.data = data
        this.success = statusCode < 400
    }
}


export { ApiResponse }