import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchDocuments = createAsyncThunk('documents/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/documents');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Failed to load documents');
  }
});

export const deleteDocument = createAsyncThunk('documents/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/documents/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Delete failed');
  }
});

export const uploadDocument = createAsyncThunk('documents/upload', async (file, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Upload failed');
  }
});

const documentSlice = createSlice({
  name: 'documents',
  initialState: { items: [], uploading: false, loading: false, error: null },
  reducers: { clearError(state) { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => { state.loading = true; })
      .addCase(fetchDocuments.fulfilled, (state, { payload }) => { state.loading = false; state.items = payload; })
      .addCase(fetchDocuments.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(uploadDocument.pending, (state) => { state.uploading = true; state.error = null; })
      .addCase(uploadDocument.fulfilled, (state, { payload }) => {
        state.uploading = false;
        state.items.unshift(payload);
      })
      .addCase(uploadDocument.rejected, (state, { payload }) => { state.uploading = false; state.error = payload; })

      .addCase(deleteDocument.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((d) => d.id !== payload);
      })
      .addCase(deleteDocument.rejected, (state, { payload }) => { state.error = payload; });
  },
});

export const { clearError } = documentSlice.actions;
export default documentSlice.reducer;
