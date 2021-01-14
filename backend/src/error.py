from werkzeug.exceptions import HTTPException

class BadRequestError(HTTPException):
    code = 400
    message = 'No message specified'

class UnauthorizedError(HTTPException):
    code = 401
    message = 'No message specified'