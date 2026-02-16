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
        publishableKey="pk_test_51SsLBcDQuGK5KpygzJjMxnCkN5YDTfR0mrVSdH93hSbJDOFry9RBJYG9046FqDyk3pelmMVWUFbyzaVJLNKLv1cR00W98Wqxk0"
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
