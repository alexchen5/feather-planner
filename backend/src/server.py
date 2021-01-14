import os
import pymongo
from json import dumps
from flask import Flask, request
from flask_cors import CORS

import auth 
import calendars

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
def app_accounts_checkin():
    return {
        'success': accounts.token_exists(request.args.get('token'))
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
def app_accounts_logout():
    return accounts.logout(request.get_json()['token'])

@app.route('/calendar/plan/new', methods=['POST'])
def app_calendar_plan_new():
    r = request.get_json()
    return calendar.user(accounts.get_u_id(r['token'])).new_plan(r['date'], r['content'])

@app.route('/calendar/plan/copy', methods=['POST'])
def app_calendar_plan_copy():
    r = request.get_json()
    return calendar.user(accounts.get_u_id(r['token'])).copy_plan(r['plan_id'], r['date'])

@app.route('/calendar/plan/delete', methods=['DELETE'])
def app_calendar_plan_delete():
    r = request.get_json()
    return calendar.user(accounts.get_u_id(r['token'])).delete_plan(r['plan_id'])

@app.route('/calendar/plan/edit', methods=['PUT'])
def app_calendar_plan_edit():
    r = request.get_json()
    return calendar.user(accounts.get_u_id(r['token'])).edit_plan(r['plan_id'], r['content'])

@app.route('/calendar/date/edit', methods=['PUT'])
def app_calendar_date_edit():
    r = request.get_json()
    return calendar.user(accounts.get_u_id(r['token'])).edit_dates(r['date'], r['plan_ids'])

@app.route('/calendar/date', methods=['GET'])
def app_calendar_date_get():
    return calendar.user(accounts.get_u_id(request.args.get('token'))).get_plans(request.args.get('date'))

if __name__ == "__main__":
    app.run(port=0)