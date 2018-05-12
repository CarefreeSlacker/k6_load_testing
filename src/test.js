const gql = require("graphql-tag")
import http from "k6/http"
// import gql from "graphql-tag"
// import apollo from './lib/apolloCustomer.js'


// const sendCustomerRequest = function(payload) {
//     return http.post(customerUrl, JSON.stringify(payload), { headers: {} })
// }
//
// const initAuth = function(phoneNumber) {
//     const result = sendCustomerRequest({
//         query: 'mutation InitAuth($provider: String!, $providerId: String!){\
//               initAuth(provider: $provider, providerId: $providerId) {\
//                 id\
//               }\
//             }',
//         variables: {
//             provider: "phone",
//             providerId: phoneNumber
//         },
//         operationName: "InitAuth"
//     })
//     console.log(`result: ${JSON.stringify(result.body)}`)
//     return result
// }
const mutation = gql`
mutation InitAuth($provider: String!, $providerId: String!){
  initAuth(provider: $provider, providerId: $providerId) {
    id
  }
}`;

function initAuth(type, title) {
    return apollo.client.mutate({
        fetchPolicy: 'network-only',
        variables: {
            provider: type,
            providerId: title
        },
        mutation
    }).then(res => res.data.initAuth)
        .catch((err) => {
            if (err.graphQLErrors.length) {
                const errors = err.graphQLErrors[0].message;
                throw errors;
            } else {
                throw err;
            }
        });
}

export default function() {
    const result = initAuth("phone", "89997777777")
    console.log(`result: ${JSON.stringify(result)}`)
    //http.post(customerUrl, {}, {})
}
