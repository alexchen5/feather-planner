import auth

def test_register_validity():
    '''
    Check that token is valid
    Check that a user is actually added
    '''
    test_creds = auth.Auth()
    token = test_creds.register('email@test.com', 'Full Test Name', 'testusername1', 'testpassword!')
    
    assert(test_creds.get_user(token).email == 'email@test.com')
    assert(test_creds.get_user(token).fullname == 'Full Test Name')
    assert(test_creds.get_user(token).username == 'testusername1')
    assert(test_creds.get_user(token).password == 'testpassword!')
    assert(test_creds.get_user(token).tokens == [token])

    assert(test_creds.users[0] == test_creds.get_user(token))

def test_register_duplicity():
    '''
    Check that redundancy checks with email and username duplicates work 
    '''
    test_creds = auth.Auth()
    test_creds.register('emailDup@test.com', 'Full Test Name', 'testusername1', 'testpassword!')
    assert not test_creds.register('emailDup@test.com', 'Full Test Name', 'testusername2', 'testpassword!')
    assert not test_creds.register('emailnotDup@test.com', 'Full Test Name', 'testusername1', 'testpassword!')

    assert not test_creds.register('emailDup@test.com', 'Full Test Name', 'testusername1', 'testpassword!')

def test_login_validity():
    '''
    Check that a user is able to login and recieve a new valid token
    '''
    test_creds = auth.Auth()
    test_creds.register('email@test.com', 'Full Test Name', 'testusername1', 'testpassword!')
    token = test_creds.login('email@test.com', 'testpassword!')

    assert test_creds.get_user(token).email == 'email@test.com'

def test_login_multiple():
    '''
    Check that all login tokens are valid when new logins are made
    '''
    test_creds = auth.Auth()
    token0 = test_creds.register('email@test.com', 'Full Test Name', 'testusername1', 'testpassword!')
    token1 = test_creds.login('email@test.com', 'testpassword!')
    token2 = test_creds.login('email@test.com', 'testpassword!')
    token3 = test_creds.login('email@test.com', 'testpassword!')

    assert test_creds.get_user(token0).email == 'email@test.com'
    assert test_creds.get_user(token1).email == 'email@test.com'
    assert test_creds.get_user(token2).email == 'email@test.com'
    assert test_creds.get_user(token3).email == 'email@test.com'

def test_login_incorrect():
    '''
    Check error on invalid credentials
    '''
    test_creds = auth.Auth()
    test_creds.register('email@test.com', 'Full Test Name', 'testusername1', 'testpassword!')

    assert not test_creds.login('email@test.com', 'wrongpw')
    assert not test_creds.login('invalidmail@test.com', 'testpassword!')
    assert not test_creds.login('', '')
    
def test_logout_validity():
    '''
    Check that a token is no longer able to be used once logged out
    '''
    test_creds = auth.Auth()
    token0 = test_creds.register('email@test.com', 'Full Test Name', 'testusername1', 'testpassword!')

    assert test_creds.logout(token0)
    assert not test_creds.get_user(token0)

def test_logout_multiple():
    '''
    Check that other tokens still work after logging out 
    '''
    test_creds = auth.Auth()
    token0 = test_creds.register('email@test.com', 'Full Test Name', 'testusername1', 'testpassword!')
    token1 = test_creds.login('email@test.com', 'testpassword!')
    token2 = test_creds.login('email@test.com', 'testpassword!')
    token3 = test_creds.login('email@test.com', 'testpassword!')

    assert test_creds.logout(token0)
    assert test_creds.logout(token3)

    assert test_creds.get_user(token1).email == 'email@test.com'
    assert test_creds.get_user(token2).email == 'email@test.com'
    assert not test_creds.get_user(token3)

def test_double_logout():
    '''
    Check that you cannot logout twice with the same token
    '''
    test_creds = auth.Auth()
    token = test_creds.register('email@test.com', 'Full Test Name', 'testusername1', 'testpassword!')
    assert test_creds.logout(token)
    assert not test_creds.logout(token)
