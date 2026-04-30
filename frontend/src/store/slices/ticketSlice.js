import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchTickets = createAsyncThunk('tickets/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/tickets');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to load tickets');
  }
});

export const createTicket = createAsyncThunk('tickets/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/tickets', payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to create ticket');
  }
});

export const updateTicket = createAsyncThunk('tickets/update', async ({ id, ...body }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/tickets/${id}`, body);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to update ticket');
  }
});

export const retriageTicket = createAsyncThunk('tickets/retriage', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/tickets/${id}/retriage`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Re-triage failed');
  }
});

export const deleteTicket = createAsyncThunk('tickets/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/tickets/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to delete ticket');
  }
});

const ticketSlice = createSlice({
  name: 'tickets',
  initialState: { items: [], loading: false, error: null },
  reducers: { clearError(state) { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTickets.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTickets.fulfilled, (state, { payload }) => { state.loading = false; state.items = payload; })
      .addCase(fetchTickets.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(createTicket.fulfilled, (state, { payload }) => { state.items.unshift(payload); })
      .addCase(createTicket.rejected, (state, { payload }) => { state.error = payload; })

      .addCase(updateTicket.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((t) => t.id === payload.id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(updateTicket.rejected, (state, { payload }) => { state.error = payload; })

      .addCase(deleteTicket.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((t) => t.id !== payload);
      })
      .addCase(deleteTicket.rejected, (state, { payload }) => { state.error = payload; })

      .addCase(retriageTicket.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex((t) => t.id === payload.id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(retriageTicket.rejected, (state, { payload }) => { state.error = payload; });
  },
});

export const { clearError } = ticketSlice.actions;
export default ticketSlice.reducer;
