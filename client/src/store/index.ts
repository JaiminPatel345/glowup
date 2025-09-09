import { configureStore } from '@reduxjs/toolkit';
import videoSlice from './slices/videoSlice';
import connectionSlice from './slices/connectionSlice';

export const store = configureStore({
  reducer: {
    video: videoSlice,
    connection: connectionSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['video/setProcessedFrame'],
        ignoredPaths: ['video.processedFrame', 'video.originalFrame'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
