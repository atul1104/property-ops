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
    streaming: false,
    error: null,
  },
  reducers: {
    clearChat(state) {
      state.messages = [];
      state.sessionId = null;
      state.error = null;
      state.streaming = false;
    },
    streamingStart(state, { payload: { question, documentId } }) {
      state.loading = true;
      state.streaming = true;
      state.error = null;
      state.messages.push(
        { role: 'user', content: question, documentId: documentId || null, timestamp: new Date().toISOString() },
        { role: 'assistant', content: '', sources: [], streaming: true, timestamp: new Date().toISOString() }
      );
    },
    streamingChunk(state, { payload: chunk }) {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === 'assistant') last.content += chunk;
    },
    streamingDone(state, { payload: { sources, sessionId } }) {
      state.loading = false;
      state.streaming = false;
      if (sessionId) state.sessionId = sessionId;
      const last = state.messages[state.messages.length - 1];
      if (last?.role === 'assistant') {
        last.sources = sources;
        last.streaming = false;
      }
    },
    streamingError(state, { payload }) {
      state.loading = false;
      state.streaming = false;
      state.error = payload;
      if (state.messages.at(-1)?.role === 'assistant') state.messages.pop();
      if (state.messages.at(-1)?.role === 'user') state.messages.pop();
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

export const { clearChat, streamingStart, streamingChunk, streamingDone, streamingError } = chatSlice.actions;
export default chatSlice.reducer;
