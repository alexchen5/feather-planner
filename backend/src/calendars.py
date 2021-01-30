import secrets

from error import BadRequestError, UnauthorizedError

class Plan:
    def __init__(self, plan_id, content):
        self.plan_id = plan_id      # Plan_ids are unique for user calendars
        self.content = content      # Application defined content as json str

class Calendar:
    '''
    Provides methods to manipulate a user's calendar
    '''
    def __init__(self):
        self.dates = {}     # Arrays of plan_ids indexed by dates (string in 'YYYYMMDD')
        self.plans = {}     # Plan instances indexed by plan_id

    def plan_id_exists(self, plan_id):
        for id in self.plans.keys():
            if id == plan_id:
                return True 
        return False

    def new_plan_id(self):
        ret = secrets.randbits(32)
        while self.plan_id_exists(ret):
            ret = secrets.randbits(32)
        return ret

    def new_plan(self, date, content):
        '''
        Generates a new plan
        Returns the plan_id of the new plan
        '''
        plan_id = self.new_plan_id()
        self.plans[plan_id] = Plan(plan_id, content)

        try:
            self.dates[date].append(plan_id)
        except KeyError:
            self.dates[date] = [plan_id]

        return {
            'plan_id': plan_id
        }

    def copy_plan(self, plan_id, date):
        '''
        Generates a new plan by copying content from another plan
        Returns the plan_id of the new plan
        BadRequestError('Plan does not exist') if plan_id is not found
        '''
        try:
            plan = self.plans[plan_id]
        except KeyError:
            raise BadRequestError(f'plan_id {plan_id} does not exist')

        return self.new_plan(date, plan.content)

    def delete_plan(self, plan_id):
        '''
        Deletes an exisitng plan
        Assumes that the plan_id will be adequetly removed from dates
        BadRequestError('Plan does not exist') if plan_id is not found
        '''
        try:
            del self.plans[plan_id]
        except KeyError:
            raise BadRequestError(f'plan_id {plan_id} does not exist')

        return {}

    def edit_plan(self, plan_id, content):
        '''
        Edits the content of an existing plan
        BadRequestError if plan_id is not found
        '''
        try:
            self.plans[plan_id].content = content
        except KeyError:
            raise BadRequestError(f'plan_id {plan_id} does not exist')

        return {}

    def edit_dates(self, date, plan_ids):
        '''
        Edits the array of plan_ids at a date
        Includes a redundancy check that the plan_ids are all in self.plans
        BadRequestError('Plan does not exist') if plan_id is not found
        '''
        for plan_id in plan_ids:
            if plan_id not in self.plans.keys():
                raise BadRequestError(f'plan_id {plan_id} does not exist')
        
        self.dates[date] = [plan_id for plan_id in plan_ids]

        return {}

    def get_plans(self, date):
        '''
        Returns a dict with plan_id and content for all plans at a date
        The order of the plans must be as followed in the date
        BadRequestError('Plan does not exist') if plan_id is not found at a date
        '''
        plans = []
        try:
            for plan_id in self.dates[date]:
                try:
                    plan = self.plans[plan_id]
                except:
                    self.dates[date].remove(plan_id)
                    raise BadRequestError(f'plan_id {plan_id} at {date} does not exist - please reload')

                plans.append({
                    'plan_id': plan.plan_id,
                    'content': plan.content,
                })
        except KeyError:
            pass

        return {
            'date_str': date,
            'plans': plans,
        }

class Calendars:
    '''
    Provides methods to asign new calendars to users and return user calendars
    '''
    def __init__(self):
        self.calendars = {}

    def add_user(self, u_id):
        '''
        Adds a new calender for a given u_id
        BadRequestError('User calendar already exists') raised if u_id already has 
        an associated calendar
        '''
        if u_id in self.calendars:
            raise BadRequestError('User calendar already exists')
        self.calendars[u_id] = Calendar()
    
    def user(self, u_id):
        '''
        Returns the user calendar for a given user
        BadRequestError('User does not have a calendar') raised if u_id 
        does not have an associated calendar
        '''
        if u_id not in self.calendars:
            raise BadRequestError(f'User {u_id} does not have a calendar')
        return self.calendars[u_id]
