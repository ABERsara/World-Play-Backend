import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { authService } from '../services/auth.service';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await authService.login(email, password);
      onLoginSuccess(); // פונקציה שתעביר אותנו למסך הסטודיו
    } catch (error) {
      alert('Login Failed: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} color="#ff4757" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#1a1a1a' },
  title: { fontSize: 24, color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15 }
});