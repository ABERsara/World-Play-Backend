// app/index.js
import { useState } from 'react';
import LoginScreen from '../screens/LoginScreen';
import ShopScreen from '../screens/ShopScreen';

export default function Page() {
  const [user, setUser] = useState(null);

  // ה-StripeProvider וה-Redux Provider כבר עוטפים את הקומפוננטה הזו מ-_layout.js
  return !user ? (
    <LoginScreen onLoginSuccess={(data) => setUser(data)} />
  ) : (
    <ShopScreen userId={user.id} onLogout={() => setUser(null)} />
  );
}
