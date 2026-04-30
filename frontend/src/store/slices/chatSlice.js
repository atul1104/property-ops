import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const sendMessage = createAsyncThunk('chat/send', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/chat', payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Chat request failed');
  }
});

export const loadHistory = createAsyncThunk('chat/loadHistory', async (sessionId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/chat/history/${sessionId}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to load history');
  }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    sessionId: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearChat(state) {
      state.messages = [];
      state.sessionId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state, { meta }) => {
        state.loading = true;
        state.error = null;
        state.messages.push({
          role: 'user',
          content: meta.arg.question,
          documentId: meta.arg.documentId || null,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(sendMessage.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.sessionId = payload.sessionId;
        state.messages.push({
          role: 'assistant',
          content: payload.answer,
          sources: payload.sources,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(sendMessage.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
        // Remove the optimistic user message on failure
        state.messages.pop();
      })
      .addCase(loadHistory.fulfilled, (state, { payload }) => {
        state.messages = payload;
      });
  },
});

export const { clearChat } = chatSlice.actions;
export default chatSlice.reducer;
