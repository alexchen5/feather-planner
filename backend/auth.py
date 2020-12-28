import secrets

class User:
    '''
    Defines the structure of information for users
    '''
    def __init__(self, email, fullname, username, password):
        self.email = email          # Will be used as the username for backend purposes
        self.fullname = fullname    # For presentation
        self.username = username    # For presentation
        self.password = password    # Login
        self.tokens = []            # Allows account to be accessed accross multiple browsers without logging in

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

    def login(self, email, password):
        '''
        Generates a new token for a browser to have access to an account 
        Returns the token on success, False on error
        '''
        for u in self.users:
            if u.email == email and u.password == password:
                new_tok = self.new_token()
                u.tokens.append(new_tok)
                return new_tok
        return False
    
    def register(self, email, fullname, username, password):
        '''
        Adds a new User from given information
        The integrity of the arguments are assumed to be checked on the frontend
        Redundancy check that the email and username is unique is included for security
        Returns token on success, False on error
        '''
        if self.email_exists(email) or self.username_exists(username):
            return False
        newUser = User(email, fullname, username, password)
        new_tok = self.new_token()
        newUser.tokens.append(new_tok)
        self.users.append(newUser)
        return new_tok

    def logout(self, token):
        '''
        Removes the given token from a User, preventing the same token from being used again to log in
        Returns True on success, False on error
        '''
        user = self.get_user(token)
        if user:
            user.tokens.remove(token)
            return True
        else:
            return False