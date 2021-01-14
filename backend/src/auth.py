import secrets

from error import BadRequestError, UnauthorizedError

class User:
    '''
    Defines the structure of information for users
    '''
    def __init__(self, u_id, token, email, fullname, username, password):
        self.u_id = u_id            # Integer value for backend to identify each user
        self.tokens = [token]       # Allows account to be accessed accross multiple browsers without logging in
        self.email = email          
        self.fullname = fullname    
        self.username = username    
        self.password = password

    def __str__(self):
        return f"{(('email', self.email), ('fullname', self.fullname), ('username', self.username), ('password', self.password), ('tokens', self.tokens))}"

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

    def token_exists(self, token):
        for u in self.users:
            if token in u.tokens:
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

    def new_token(self):
        '''
        Generates a new random token that is not used by any user
        '''
        tok = secrets.token_urlsafe()
        while self.token_exists(tok):
            tok = secrets.token_urlsafe()
        return tok

    def get_user(self, token):
        '''
        Returns a User object from a given token
        Returns False if a User cannot be found
        '''
        for u in self.users:
            if token in u.tokens:
                return u
        return False

    def get_u_id(self, token):
        '''
        Returns the u_id of a given token
        False if user cannot be found
        ''' 
        for u in self.users:
            if token in u.tokens:
                return u.u_id
        return False

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
                    token = self.new_token()
                    u.tokens.append(token)
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
        new_tok = self.new_token()
        new_u_id = self.new_u_id()
        self.users.append(User(new_u_id, new_tok, email, fullname, username, password))
        return {
            'token': new_tok,
            'u_id': new_u_id,
        }

    def logout(self, token):
        '''
        Removes the given token from a User, preventing the same token from being used again to log in
        Returns {} on success
        Raises: UnauthorizedError('Please log in again to complete your request')
        '''
        user = self.get_user(token)
        if user:
            user.tokens.remove(token)
            return {}
        else:
            raise UnauthorizedError('Please log in again to complete your request')