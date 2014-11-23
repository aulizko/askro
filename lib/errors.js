function ValidationError(message) {
    this.message = message;
    this.name = 'ValidationError';
    Error.captureStackTrace(this, ValidationError);
}
ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.constructor = ValidationError;

exports.ValidationError = ValidationError;
