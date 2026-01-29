import { useState } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native'; 
import LoginScreen from '../screens/LoginScreen';
import ShopScreen from '../screens/ShopScreen'; 

export default function Page() {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const renderContent = () => {
    if (!user) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }
    
    // מציג את החנות מיד לאחר הלוגין
    return <ShopScreen userId={user.id} />; 
  };

  return (
    <StripeProvider
      publishableKey="pk_test_51SsLBcDQuGK5KpygzJjMxnCkN5YDTfR0mrVSdH93hSbJDOFry9RBJYG9046FqDyk3pelmMVWUFbyzaVJLNKLv1cR00W98Wqxk0"
      merchantIdentifier="merchant.com.worldplay"
    >
      {renderContent()}
    </StripeProvider>
  );
}