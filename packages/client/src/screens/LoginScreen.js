import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Button
} from 'react-native';
import { useRouter } from 'expo-router'; 
import PropTypes from 'prop-types';
import { authService } from '../services/auth.service';
import { connectSocket } from '../services/socket.service';

const LoginScreen = ({ onLoginSuccess }) => {
  const router = useRouter(); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    setLoading(true);
    try {
      const data = await authService.login(email, password);
      await connectSocket();
      onLoginSuccess({
        id: data.user.id,
        email: data.user.email,
        username: data.user.username || data.user.email,
      });
    } catch (error) {
      Alert.alert('שגיאת התחברות', error.message || 'פרטים שגויים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎮 WorldPlay</Text>
      <Text style={styles.subtitle}>התחברות</Text>

      <TextInput
        style={styles.input}
        placeholder="אימייל"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="סיסמה"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>כניסה</Text>}
      </TouchableOpacity>

      

    </View>
  );
};

LoginScreen.propTypes = {
  onLoginSuccess: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#1a1a1a' },
  title: { fontSize: 36, textAlign: 'center', color: '#ffa502', fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 24, textAlign: 'center', color: '#fff', marginBottom: 30 },
  input: { backgroundColor: '#2f3542', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, textAlign: 'right' },
  loginBtn: { backgroundColor: '#ffa502', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  loginBtnDisabled: { opacity: 0.6 },
  loginText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
});

export default LoginScreen;