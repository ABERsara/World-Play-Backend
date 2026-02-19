import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store/index';
import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
  return (
    // 1. עטיפה ב-Redux כדי שהסוקט וה-Middleware יתחילו לעבוד
    <Provider store={store}>
      {/* 2. עטיפה ב-Stripe כדי לאפשר סליקה בכל מקום באפליקציה */}
      <StripeProvider
        publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
        merchantIdentifier="merchant.com.worldplay"
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#1a1a1a' },
          }}
        />
      </StripeProvider>
    </Provider>
  );
}
