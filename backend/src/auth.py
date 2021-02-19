import secrets
import jwt

from error import BadRequestError, UnauthorizedError
from key import jwt_key

class User:
    '''
    Defines the structure of information for users
    '''
    def __init__(self, u_id, email, fullname, username, password):
        self.u_id = u_id                # Integer value for backend to identify each user
        self.email = email          
        self.fullname = fullname    
        self.username = username    
        self.password = password
        self.session_ids = []           # Active sessions ids
        self.next_session_id = 0        # Next session id to be used

    def __str__(self):
        return f"{(('email', self.email), ('fullname', self.fullname), ('username', self.username), ('password', self.password))}"

    def set_session(self):
        new_session = self.next_session_id
        self.session_ids.append(new_session)
        self.next_session_id = self.next_session_id + 1
        return new_session

class Auth:
    '''
    Holds credential information for all users
    Includes methods to navigate this information
    '''
    def __init__(self):
        self.users = []
    
    def __str__(self):
        return f'{self.users}'

    def email_exists(self, email):
        for u in self.users:
            if u.email == email:
                return True 
        return False

    def username_exists(self, username):
        for u in self.users:
            if u.username == username:
                return True 
        return False

    def u_id_exists(self, u_id):
        for u in self.users:
            if u.u_id == u_id:
                return True 
        return False
    
    def new_u_id(self):
        '''
        Generates a new random token that is not used by any user
        '''
        id = secrets.randbits(32)
        while self.u_id_exists(id):
            id = secrets.randbits(32)
        return id

    def get_user(self, u_id):
        for u in self.users:
            if u.u_id == u_id:
                return u
        return False

    def check_token(self, token):
        '''
        Returns the u_id from a given token
        Raises: UnauthorizedError('Malicious token') if token cannot be parsed
        Raises: UnauthorizedError('Session Invalid') if user session does not exist
        '''
        try:
            decoded_token = jwt.decode(token, jwt_key(), algorithms="HS256")
        except jwt.exceptions.InvalidTokenError:
            raise UnauthorizedError('Malicious token')

        for u in self.users:
            if decoded_token['u_id'] == u.u_id:
                if decoded_token['session_id'] in u.session_ids:
                    return decoded_token
        raise UnauthorizedError(f'Session Invalid: {decoded_token}')

    def login(self, email, password):
        '''
        Generates a new token for a browser to have access to an account 
        Returns {
            status: < 0 (success) > < 1 (password error) > < 2 (email error) >
            token: < access token if status == 0, else empty string > 
        }
        '''
        status = 2
        token = ''
        for u in self.users:
            if u.email == email:
                status = 1
                if u.password == password:
                    status = 0
                    token = jwt.encode({
                        'u_id': u.u_id,
                        'session_id': u.set_session(),
                    }, jwt_key(), algorithm="HS256").decode('UTF-8')
        return {
            'status': status,
            'token': token
        }
    
    def register(self, email, fullname, username, password):
        '''
        Adds a new User from given information
        The integrity of the arguments are assumed to be checked on the frontend
        Redundancy check that the email and username is unique is included for security
        Returns {
            'token': < access token >
            'u_id': < user id (int-32) >
        }
        Raises: BadRequestError('Cannot register with duplicate email or username')
        '''
        if self.email_exists(email) or self.username_exists(username):
            raise BadRequestError('Cannot register with duplicate email or username')
        new_u_id = self.new_u_id()
        new_user = User(new_u_id, email, fullname, username, password)
        self.users.append(new_user)
        return {
            'token': jwt.encode(
                {
                    'u_id': new_u_id,
                    'session_id': new_user.set_session(),
                }, 
                jwt_key(), 
                algorithm="HS256"
            ).decode('UTF-8'),
            'u_id': new_u_id,
        }

    def logout(self, u_id, session_id):
        '''
        Removes the session_id from a user
        Returns {} on success
        '''
        self.get_user(u_id).session_ids.remove(session_id)
        return {}