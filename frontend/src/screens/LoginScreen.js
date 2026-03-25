import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleSubmit = async () => {
    if (!username || !password) {
      Alert.alert('Błąd', 'Wypełnij oba pola');
      return;
    }
    const result = await login(username, password);
    if (!result.success) {
      Alert.alert('Błąd', result.error || 'Nieprawidłowe dane');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>V</Text>
      <TextInput
        style={styles.input}
        placeholder="Nazwa użytkownika"
        placeholderTextColor="#aaa"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Hasło"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Kontynuuj</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 48,
    color: '#AA00FF',
    marginBottom: 50,
    fontFamily: 'monospace'
  },
  input: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#AA00FF'
  },
  button: {
    backgroundColor: '#AA00FF',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});