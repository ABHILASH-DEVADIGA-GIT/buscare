import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getClients = () => api.get('/clients');

// Buses
export const getBuses = () => api.get('/buses');
export const createBus = (data) => api.post('/buses', data);

// Checklist
export const getChecklist = () => api.get('/checklist');
export const createChecklistQuestion = (data) => api.post('/checklist', data);

// Inspections
export const getInspections = (status) => api.get('/inspections', { params: { status } });
export const getInspectionById = (id) => api.get(`/inspections/${id}`);
export const createInspection = (data) => api.post('/inspections', data);
export const assignMechanic = (data) => api.post('/inspections/assign-mechanic', data);
export const fixDetail = (data) => api.post('/inspections/fix-detail', data);
export const quickFix = (data) => api.post('/inspections/quick-fix', data);
export const verifyInspection = (data) => api.post('/inspections/verify', data);

// Mechanics
export const getMechanics = () => api.get('/mechanics');

// Feedback
export const getFeedback = () => api.get('/feedback');
export const createFeedback = (data) => api.post('/feedback', data);
export const resolveFeedback = (data) => api.post('/feedback/resolve', data);

// Alerts
export const getAlerts = (statusFilter) => api.get('/alerts', { params: { status_filter: statusFilter } });
export const createAlert = (data) => api.post('/alerts', data);
export const updateAlert = (data) => api.post('/alerts/update', data);

// Collections
export const getCollections = (params) => api.get('/collections', { params });
export const createCollection = (data) => api.post('/collections', data);

// Expenses
export const getExpenseMaster = () => api.get('/expense-master');
export const createExpenseMaster = (data) => api.post('/expense-master', data);
export const getExpenses = (params) => api.get('/expenses', { params });
export const createExpense = (data) => api.post('/expenses', data);

// Profit
export const getBusWiseProfit = (params) => api.get('/profit/bus-wise', { params });

// Dashboard
export const getDashboardMetrics = (params) => api.get('/dashboard/metrics', { params });

// Upload
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Seed
export const seedData = () => api.post('/seed');

// Add Problem
export const addProblem = (data) => api.post('/inspections/add-problem', data);

// Client Management (Platform Admin)
export const createClient = (data) => api.post('/clients', data);
export const getAllClients = () => api.get('/clients/all');
export const updateClient = (data) => api.put('/clients', data);

// User Management (Platform Admin)
export const createUserByAdmin = (data) => api.post('/users/create', data);
export const getAllUsers = () => api.get('/users/all');
export const getAllBusesByClient = () => api.get('/buses/all');
export const updateUserByAdmin = (userId, data) => api.put(`/users/${userId}`, null, { params: data });
export const changeUserPassword = (userId, newPassword) => api.put(`/users/${userId}/password`, null, { params: { new_password: newPassword } });

// Platform Admin Configuration APIs
export const getInspectionQuestionsConfig = (params) => api.get('/config/inspection-questions', { params });
export const createInspectionQuestionConfig = (data) => api.post('/config/inspection-questions', data);
export const updateInspectionQuestionConfig = (data) => api.put('/config/inspection-questions', data);
export const deleteInspectionQuestionConfig = (questionId) => api.delete(`/config/inspection-questions/${questionId}`);

export const getExpenseCategoriesConfig = (params) => api.get('/config/expense-categories', { params });
export const createExpenseCategoryConfig = (data) => api.post('/config/expense-categories', data);
export const updateExpenseCategoryConfig = (data) => api.put('/config/expense-categories', data);

export const getAlertConfigs = (params) => api.get('/config/alerts', { params });
export const createAlertConfig = (data) => api.post('/config/alerts', data);
export const updateAlertConfig = (data) => api.put('/config/alerts', data);
export const deleteAlertConfig = (alertId) => api.delete(`/config/alerts/${alertId}`);

