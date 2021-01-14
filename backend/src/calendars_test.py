import pytest

import auth
import calendars
from error import BadRequestError, UnauthorizedError

def test_new_plan():
    '''
    Check that a new plan can be validly added to data
    '''
    test_calendar = calendars.Calendar()
    plan = test_calendar.new_plan('2021015', 'asdfdsfdfs')

    assert test_calendar.get_plans('2021015')['plans'] == [{
        'plan_id': plan['plan_id'],
        'content': 'asdfdsfdfs',
    }]

def test_plan_edit():
    '''
    Check that a plan can be validly edited
    '''
    test_calendar = calendars.Calendar()
    plan = test_calendar.new_plan('2021015', 'asdfdsfdfs')

    test_calendar.edit_plan(plan['plan_id'], 'asdfsdff')

    assert test_calendar.get_plans('2021015')['plans'] == [{
        'plan_id': plan['plan_id'],
        'content': 'asdfsdff',
    }]

