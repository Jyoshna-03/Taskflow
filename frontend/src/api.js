import axios from 'axios';

// In dev, package.json "proxy" forwards /api → localhost:5000
// In prod, REACT_APP_API_URL points to the Railway backend
const BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({ baseURL: BASE });

// Auto-attach JWT
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('tf_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Redirect on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tf_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  signup: d  => api.post('/auth/signup', d),
  login:  d  => api.post('/auth/login',  d),
  me:     () => api.get('/auth/me'),
};

export const projectsAPI = {
  list:         ()        => api.get('/projects'),
  get:          id        => api.get(`/projects/${id}`),
  create:       d         => api.post('/projects', d),
  update:       (id, d)   => api.patch(`/projects/${id}`, d),
  remove:       id        => api.delete(`/projects/${id}`),
  addMember:    (id, d)   => api.post(`/projects/${id}/members`, d),
  removeMember: (id, uid) => api.delete(`/projects/${id}/members/${uid}`),
  changeRole:   (id, uid, role) => api.patch(`/projects/${id}/members/${uid}/role`, { role }),
};

export const tasksAPI = {
  list:       params   => api.get('/tasks', { params }),
  stats:      ()       => api.get('/tasks/dashboard/stats'),
  get:        id       => api.get(`/tasks/${id}`),
  create:     d        => api.post('/tasks', d),
  update:     (id, d)  => api.patch(`/tasks/${id}`, d),
  remove:     id       => api.delete(`/tasks/${id}`),
  addComment: (id, text) => api.post(`/tasks/${id}/comments`, { text }),
};

export const usersAPI = {
  search: email => api.get('/users/search', { params: { email } }),
};

export default api;