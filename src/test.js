import http from "k6/http"

const customerUrl = 'http://localhost:4000/api/customers'
const regularUrl = 'http://localhost:4000/api'
let authorizationHeader = '';

const sendCustomerRequest = function(payload) {
    const request = http.post(customerUrl, JSON.stringify(payload), { headers: {'Content-Type': 'application/json'} })
    return JSON.parse(request.body)
}

const sendRegularRequest = function(payload) {
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

const getRequestTypes = function() {
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
    })
    return result.data.requestTypes
}

const initActivity = function(requestTypeId) {
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
    })
    return result.data.activityByRequestType.id
}

export default function() {
    const authId = initAuth('89997777777')
    const { customer, token } = signIn(authId, '12345678')
    console.log(`customer: ${JSON.stringify(customer)},\n token: ${JSON.stringify(token)}`)
    authorizationHeader = { 'authorization': `Bearer ${token}` }
    const requestTypes = getRequestTypes()
    const randomRequestType = requestTypes[Math.floor(Math.random() * requestTypes.length)]
    const activityId = initActivity(randomRequestType.id)
    console.log(`activityId: ${activityId}`)
}
