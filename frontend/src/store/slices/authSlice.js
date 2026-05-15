import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', data.email);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', data.email);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Registration failed');
  }
});

const token = localStorage.getItem('token');
const storedEmail = localStorage.getItem('email');

// Decode role from stored token without adding a jwt library
const decodeRole = (t) => {
  try {
    return JSON.parse(atob(t.split('.')[1])).role;
  } catch {
    return null;
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: token || null,
    role: token ? decodeRole(token) : null,
    email: storedEmail || null,
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      localStorage.removeItem('token');
      localStorage.removeItem('email');
      state.token = null;
      state.role = null;
      state.email = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const fulfilled = (state, { payload }) => {
      state.loading = false;
      state.token = payload.token;
      state.role = payload.role;
      state.email = payload.email;
    };
    const rejected = (state, { payload }) => { state.loading = false; state.error = payload; };

    builder
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, fulfilled)
      .addCase(loginUser.rejected, rejected)
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, fulfilled)
      .addCase(registerUser.rejected, rejected);
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
