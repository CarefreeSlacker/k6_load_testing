import http from "k6/http"
import ws from "k6/ws";
import { check } from "k6";
// import { Channel } from './phoenix.js'

const customerUrl = 'http://localhost:4000/api/customers'
const regularUrl = 'http://localhost:4000/api'

const sendCustomerRequest = function(payload) {
    const request = http.post(customerUrl, JSON.stringify(payload), { headers: {'Content-Type': 'application/json'} })
    return JSON.parse(request.body)
}

const sendRegularRequest = function(payload, authorizationHeader) {
    const requestHeaders = Object.assign(authorizationHeader, {'Content-Type': 'application/json'})
    const request = http.post(regularUrl, JSON.stringify(payload), { headers: requestHeaders })
    return JSON.parse(request.body)
}

const initAuth = function(phoneNumber) {
    const result = sendCustomerRequest({
        query: 'mutation InitAuth($provider: String!, $providerId: String!){ initAuth(provider: $provider, providerId: $providerId) { id }}',
        variables: {
            provider: 'phone',
            providerId: phoneNumber
        },
        operationName: 'InitAuth'
    })
    return result.data.initAuth.id
}

const signIn = function(authId, token) {
    const result = sendCustomerRequest({
        query: "mutation signIn($authId: ID!, $token: String!) {\
                         tokenSignIn(authId: $authId, token: $token) {\
                           token\
                           customer {\
                             id\
                             identified\
                             firstName\
                             lastName\
                             description\
                             accounts {\
                               id\
                               provider\
                               providerId\
                               __typename\
                             }\
                             __typename\
                           }\
                           __typename\
                         }\
                       }\
                       ",
        variables: {
            authId,
            token
        },
        operationName: 'signIn'
    })
    return result.data.tokenSignIn
}

const getRequestTypes = function(requesHeaders) {
    const result = sendRegularRequest({
        query: "query requestTypes {\
                         requestTypes {\
                           id\
                           name\
                           description\
                           defaultType\
                           active\
                         }\
                       }\
                       ",
        operationName: 'requestTypes'
    },
    requesHeaders)
    return result.data.requestTypes
}

const initActivity = function(requestTypeId, requesHeaders) {
    const result = sendRegularRequest({
        query: "mutation createActivity($requestTypeId: String!) {\
                         activityByRequestType(requestTypeId: $requestTypeId) {\
                           id\
                         }\
                       }\
                       ",
        variables: {
            requestTypeId: parseInt(requestTypeId)
        },
        operationName: 'createActivity'
    },
    requesHeaders)
    return result.data.activityByRequestType.id
}


// WS client

const wsUrl = 'ws://localhost:4000/socket/websocket';

const wsBlock = function(guardianToken, customerName, activityId) {
    const wsParams = {
        'guardian_token': guardianToken,
        'username': customerName,
        'vsn': "2.0.0"
    }
    console.log(`wsBlock params: ${JSON.stringify(wsParams)}`)
    const socketUrl = `${wsUrl}?${objectToParams(wsParams)}`
    const result = ws.connect(socketUrl, { params: wsParams }, function(socket) {
        socket.on('open', function(response) {
            console.log(`open response: ${JSON.stringify(response)}`);
        });
        socket.on('phx_reply', function(response) {
            console.log(`phx_reply response: ${JSON.stringify(response)}`);
        });

        socket.on('presense_state', function(data) {
            console.log("presense_state: ", JSON.stringify(data));
        });

        socket.on('presense_diff', function(data) {
            console.log("presense_diff: ", JSON.stringify(data));
        });

        socket.on('phx_reply', function(data) {
            console.log("phx_reply: ", JSON.stringify(data));
        });

        socket.on('close', function() {
            console.log('disconnected');
        });

        socket.send(
            JSON.stringify(
                [1, 2, `room:${activityId}`, 'phx_join', {'guardian_token': guardianToken}]
            )
        )

        socket.setTimeout(function () {
            console.log('4 seconds passed, closing the socket');
            socket.close();
        }, 4000);
    });
    console.log(`socket is ready: ${JSON.stringify(result)}`)
    check(result, { "status is 101": (r) => r && r.status === 101 });
    return ws;
}

const objectToParams = function(obj) {
    var str = "";
    for (var key in obj) {
        if (str != "") {
            str += "&";
        }
        str += key + "=" + encodeURIComponent(obj[key]);
    }
    return str
}


export default function() {
    const authId = initAuth('89997777777')
    const { customer, token } = signIn(authId, '12345678')
    const authorizationHeader = { 'authorization': `Bearer ${token}` }
    const requestTypes = getRequestTypes(authorizationHeader)
    const randomRequestType = requestTypes[Math.floor(Math.random() * requestTypes.length)]
    const activityId = initActivity(randomRequestType.id, authorizationHeader)
    wsBlock(token, customer.firstName, activityId)
    console.log(`ws: ${JSON.stringify(ws)}`)
    return true
}

// "1"
// 1
// :
// "1"
// 2
// :
// "room:7eff2071-d82c-4a59-9554-a297e382e1bf"
// 3
// :
// "phx_join"
// 4
// :
// {,…}
// guardian_token
//     :
//     "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJDdXN0b21lcjoxIiwiZXhwIjoxNTI4ODEyMzg5LCJpYXQiOjE1MjYyMjAzODksImlzcyI6IkN0aU9tbmkiLCJqdGkiOiJjYzg4YThlMy0zZjY5LTQxNDgtOWE3Zi1kOWQ0MWIzNGNkY2MiLCJwZW0iOnt9LCJzdWIiOiJDdXN0b21lcjoxIiwidHlwIjoiYWNjZXNzIn0.k4vSDUiEjaYiPr-iPPBfi3Wsq6TkXkxTscGztP3-C-XB7WiVtNMTeLHKrAUAnehP4M72e6HuS6we7Z4ux4M
