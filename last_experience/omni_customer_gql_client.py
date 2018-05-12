import requests
import random

class OmniCustmerGQLClient():
    def __init__(self):
        self.customer_url = 'http://localhost:4000/api/customers'
        self.regular_url = 'http://localhost:4000/api'
        self.token = None
        self.customer = None
        self.phone_number = None
        self.request_types = []
        self.customer_cases = []
        self.current_activity_id = None

    # Behaviour methods
    def authorize(self, phone_number):
        init_auth_id = self.__init_auth_mutation(phone_number)
        signin_data = self.__sign_in_mutation(init_auth_id, "12345678")
        if signin_data:
            self.token = signin_data['token']
            self.customer = signin_data['customer']
            return True
        else:
            return False

    def get_request_types_data(self):
        if self.authorized:
            self.request_types = self.__get_request_types_query()
            self.customer_cases = self.__get_customer_cases_query()
            return True
        else:
            return False

    def initialize_activity(self):
        if len(self.customer_cases) > 0:
            if random.randint(0, 1) == 0:
                self.current_activity_id = self.__initialize_activity_random_request_type()
            else:
                self.current_activity_id = self.__initialize_activity_random_customer_case()
        else:
            self.current_activity_id = self.__initialize_activity_random_request_type()
        return True

    # Helpers
    def authorized(self):
        if self.token:
            return True
        else:
            return False

    def __initialize_activity_random_request_type(self):
        request_type = self.request_types[random.randint(0, len(self.request_types) - 1)]
        return self.__activity_by_request_type_mutation(int(request_type['id']))

    def __initialize_activity_random_customer_case(self):
        customer_case = self.customer_cases[random.randint(0, len(self.customer_cases) - 1)]
        return self.__activity_by_customer_case_mutation(int(customer_case['id']))

    # GraphQL requests
    def __init_auth_mutation(self, phone_number):
        json = {
            'query': 'mutation init_auth($provider: String!, $provider_id: String!) {\
                                    init_auth(provider: $provider, provider_id: $provider_id) {\
                                        id\
                                        __typename\
                                    }\
                               }',
            'variables': {
                'provider': 'phone',
                "provider_id": phone_number
            },
            'operation_name': 'init_auth'
        }
        response = self.__make_request(url=self.customer_url, json=json)
        if response.ok:
            return response.json()['data']['init_auth']['id']
        else:
            return False

    def __sign_in_mutation(self, auth_id, token="12345678"):
        json = {
            "query": "mutation sign_in($auth_id: String!, $token: String!) {\
                         token_sign_in(auth_id: $auth_id, token: $token) {\
                           token\
                           customer {\
                             id\
                             identified\
                             first_name\
                             last_name\
                             description\
                             accounts {\
                               id\
                               provider\
                               provider_id\
                               __typename\
                             }\
                             __typename\
                           }\
                           __typename\
                         }\
                       }\
                       ",
            "variables": {
               "auth_id": auth_id,
               "token": token
            },
            "operation_name": "sign_in"
        }
        response = self.__make_request(url=self.customer_url, json=json)
        if response.ok:
            return response.json()['data']['token_sign_in']
        else:
            return False

    def __get_request_types_query(self):
        json = {
            'query': """query request_types {
                              request_types {
                                id
                                name
                                description
                                default_type
                                active
                                __typename
                              }
                        }""",
            'operation_name': 'request_types'
        }
        headers = {'authorization': 'Bearer {0}'.format(self.token)}
        response = self.__make_request(url=self.regular_url, json=json, headers=headers)
        if response.ok:
            return response.json()['data']['request_types']
        else:
            return False

    def __get_customer_cases_query(self):
        json = {
            'query': """query customer($id: ID!) {
                            customer(id: $id) {
                                description
                                first_name
                                last_name
                                identified
                                cases(status: OPENED) {
                                    id
                                    name
                                    description
                                    messages_count
                                    inserted_at
                                    updated_at
                                    last_message {
                                        id
                                        body
                                        inserted_at
                                        __typename
                                    }
                                __typename
                                }
                            __typename
                            }
                        }""",
            'operation_name': 'customer',
            'variables': {
                'id': '{0}'.format(self.customer['id'])
            }
        }
        headers = {'authorization': 'Bearer {0}'.format(self.token)}
        response = self.__make_request(url=self.regular_url, json=json, headers=headers)
        if response.ok:
            return response.json()['data']['customer']['cases']
        else:
            return False

    def __activity_by_request_type_mutation(self, request_type_id):
        json = {
            'query': """mutation create_activity($request_type_id: Int!) {\
                          activity_by_request_type(request_type_id: $request_type_id) {\
                            id\
                            __typename\
                          }\
                      }""",
            'operation_name': 'create_activity',
            'variables': {
                'request_type_id': request_type_id
            }
        }
        headers = {'authorization': 'Bearer {0}'.format(self.token)}
        response = self.__make_request(url=self.regular_url, json=json, headers=headers)
        if response.ok:
            return response.json()['data']['activity_by_request_type']['id']
        else:
            return False

    def __activity_by_customer_case_mutation(self, case_id):
        json = {
            'query': """mutation create_activity($case_id: Int!) {
                            activity_by_case(case_id: $case_id) {
                              id
                              __typename
                            }
                          }
                          """,
            'operation_name': 'create_activity',
            'variables': {
                'case_id': case_id
            }
        }
        headers = {'authorization': 'Bearer {0}'.format(self.token)}
        response = self.__make_request(url=self.regular_url, json=json, headers=headers)
        if response.ok:
            return response.json()['data']['activity_by_case']['id']
        else:
            return False

    def __make_request(self, url, json, headers=None):
        return requests.post(url=url, json=json, headers=headers)
