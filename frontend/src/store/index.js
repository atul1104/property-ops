import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import ticketReducer from './slices/ticketSlice';
import chatReducer from './slices/chatSlice';
import documentReducer from './slices/documentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tickets: ticketReducer,
    chat: chatReducer,
    documents: documentReducer,
  },
});
