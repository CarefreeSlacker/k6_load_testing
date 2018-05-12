from omni_customer_gql_client import OmniCustmerGQLClient

import asyncio
import websockets
from requests.utils import quote

class OmniCustomerWsClient():
    def __init__(self, phone):
        self.gql_client = OmniCustmerGQLClient()
        self.gql_client.authorize(phone)
        self.gql_client.get_request_types_data()
        print("initalize")


        return None


    @asyncio.coroutine
    def initialize_activity(self):
        print("initialize actviity")
        self.gql_client.initialize_activity()
        params = 'username={0}&guardian_token={1}&vsn=2.0.0'.format(quote(self.gql_client.customer['first_name']), self.gql_client.token).encode('utf8')
        uri = "ws://localhost:4000/socket/websocket?{0}\r\n".format(params)
        print('uri: {0}'.format(uri))
        socket = yield from websockets.connect(uri)
        print("socket: {0}".format(socket))

        try:
            yield from socket.send(self.__join_channel_message())

        finally:
            yield from websocket.close()

    # Private helper methods
    def __join_channel_message(self):
        return {
            "ref": "1",
            "join_ref": "1",
            "topic": "room:".format(self.gql_client.current_activity_id),
            "event": "phx_join",
            "payload": {
                'guardian_token': self.gql_client.token
            }
        }


ws_client = OmniCustomerWsClient("89997777777")
asyncio.get_event_loop().run_until_complete(ws_client.initialize_activity())
