import { ApolloClient, createNetworkInterface } from 'apollo-client';
import { token, serverError, isArray, l, consts } from '@/utils';
import { API_PATH } from '@/config';
import eventBus from './eventBus';

const UNAUTHORIZED = 'unauthorized';

const networkInterface = createNetworkInterface({
  uri: `${API_PATH}/api/customers`,
  transportBatching: true
});

networkInterface.use([{
  applyMiddleware(req, next) {
    if (!req.options.headers) {
      req.options.headers = {};
    }
    req.options.headers.authorization = `Bearer ${token.get()}`;
    next();
  }
}]);

function logout() {
  eventBus.$emit(consts.FORCE_LOGOUT);
}

const logoutAfterware = {
  applyAfterware({ response }, next) {
    if (response.status === 401) {
      logout();
    }
    next();
  }
};

const serverErrorAfterware = {
  applyAfterware({ response }, next) {
    if (!response.ok) {
      response.clone().text().then(() => {
        next();
      });
    } else {
      response.clone().json().then(({ errors }) => {
        if (errors && isArray(errors)) {
          errors.forEach((item) => {
            if (item.message.indexOf(UNAUTHORIZED) > -1) {
              logout();
            } else if (item.error) {
              if (item.error.code === consts.UNAUTHORIZED) {
                logout();
              } else {
                serverError.handle(item.error);
              }
            }
          });
        } else if (errors) {
          l.error('errors must be array');
          l.error(`errors = ${JSON.stringify(errors)}`);
        }
        next();
      });
    }
  }
};

networkInterface.useAfter([logoutAfterware, serverErrorAfterware]);

const client = new ApolloClient({
  networkInterface,
  connectToDevTools: true
});

export default { client };
