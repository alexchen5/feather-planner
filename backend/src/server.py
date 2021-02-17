import os
import pymongo
from json import dumps
from flask import Flask, request
from flask_cors import CORS
from functools import wraps

import auth 
import calendars
from error import BadRequestError, UnauthorizedError

def defaultHandler(err):
    response = err.get_response()
    print('response', err, err.get_response())
    response.data = dumps({
        "code": err.code,
        "name": "System Error",
        "message": err.get_description(),
    })
    response.content_type = 'application/json'
    return response

def checkin(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            pair = request.headers['authorization'].split()
            if (len(pair) == 2 and pair[0] == 'Bearer'):
                return func(*args, token=accounts.check_token(pair[1]), **kwargs)
            else:
                raise UnauthorizedError('Invalid Authorization Header')
        except KeyError:
            raise UnauthorizedError('Please log in')
    return wrapper

# client = pymongo.MongoClient("mongodb+srv://alexchen:alexchen!@cluster0.uee2f.mongodb.net/Cluster0?retryWrites=true&w=majority")
# db = client.test

app = Flask(__name__)
CORS(app)

app.register_error_handler(Exception, defaultHandler)

accounts = auth.Auth()
calendar = calendars.Calendars()

@app.route('/accounts/login', methods=['POST'])
def app_accounts_login():
    return accounts.login(request.form['email'], request.form['password'])

@app.route('/accounts/register', methods=['POST'])
def app_accounts_register():
    reg = accounts.register(request.form['email'], request.form['fullname'], request.form['username'], request.form['password'])
    calendar.add_user(reg['u_id'])
    return {
        'token': reg['token']
    }

@app.route('/accounts/checkin', methods=['GET'])
@checkin
def app_accounts_checkin(token):
    return {
        'success': True,
    }

@app.route('/accounts/checkemail', methods=["GET"])
def app_accounts_checkemail():
    return {
        'email_exists': accounts.email_exists(request.args.get('email'))
    }

@app.route('/accounts/checkusername', methods=["GET"])
def app_accounts_checkusername():
    return {
        'username_exists': accounts.username_exists(request.args.get('username'))
    }

@app.route('/accounts/logout', methods=['POST'])
@checkin
def app_accounts_logout(token):
    return accounts.logout(token['u_id'], token['session_id'])

@app.route('/calendar/plan/new', methods=['POST'])
@checkin
def app_calendar_plan_new(token):
    r = request.get_json()
    return calendar.user(token['u_id']).new_plan(r['date'], r['content'])

@app.route('/calendar/plan/copy', methods=['POST'])
@checkin
def app_calendar_plan_copy(token):
    r = request.get_json()
    return calendar.user(token['u_id']).copy_plan(r['plan_id'], r['date'])

@app.route('/calendar/plan/delete', methods=['DELETE'])
@checkin
def app_calendar_plan_delete(token):
    r = request.get_json()
    return calendar.user(token['u_id']).delete_plan(r['plan_id'])

@app.route('/calendar/plan/edit', methods=['PUT'])
@checkin
def app_calendar_plan_edit(token):
    r = request.get_json()
    return calendar.user(token['u_id']).edit_plan(r['plan_id'], r['content'])

@app.route('/calendar/date/edit', methods=['PUT'])
@checkin
def app_calendar_date_edit(token):
    r = request.get_json()
    return calendar.user(token['u_id']).edit_dates(r['date'], r['plan_ids'])

@app.route('/calendar/date', methods=['GET'])
@checkin
def app_calendar_date_get(token):
    return calendar.user(token['u_id']).get_plans(request.args.get('date'))

@app.route('/calendar/dates', methods=['POST'])
@checkin
def app_calendar_dates_get(token):
    r = request.get_json()
    dates = []
    c = calendar.user(token['u_id'])
    for date in r['dates']:
        dates.append(c.get_plans(date))
    return {
        'dates': dates,
    }

if __name__ == "__main__":
    app.run(port=0)