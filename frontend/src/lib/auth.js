export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const getClient = () => {
  const client = localStorage.getItem('client');
  return client ? JSON.parse(client) : null;
};

export const setAuthData = (token, user, client) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('client', JSON.stringify(client));
};

export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('client');
};

export const isAuthenticated = () => {
  return !!getToken();
};
