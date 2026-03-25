import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function CreateChatScreen({ navigation }) {
  const { user } = useAuth();
  const [type, setType] = useState('group'); // 'group' or 'channel'
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');

  const createChat = async () => {
    if (!username.trim()) {
      Alert.alert('Błąd', 'Wprowadź nazwę użytkownika czatu');
      return;
    }

    try {
      const res = await api.post('/chats', {
        type,
        title: title || username,
        username: username.toLowerCase().replace(/\s/g, '_'),
        created_by: user.id
      });
      
      Alert.alert('Sukces', `Utworzono ${type === 'group' ? 'grupę' : 'kanał'}`);
      navigation.navigate('Invite', { chatId: res.data.chatId });
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Nie udało się utworzyć czatu';
      Alert.alert('Błąd', errMsg);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nowy {type === 'group' ? 'Grupa' : 'Kanał'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.typeSelector}>
        <TouchableOpacity 
          style={[styles.typeButton, type === 'group' && styles.typeButtonActive]}
          onPress={() => setType('group')}
        >
          <Text style={[styles.typeText, type === 'group' && styles.typeTextActive]}>Grupa</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.typeButton, type === 'channel' && styles.typeButtonActive]}
          onPress={() => setType('channel')}
        >
          <Text style={[styles.typeText, type === 'channel' && styles.typeTextActive]}>Kanał</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder={type === 'group' ? 'Nazwa grupy' : 'Nazwa kanału'}
        placeholderTextColor="#aaa"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={styles.input}
        placeholder="Nazwa użytkownika (unikalna)"
        placeholderTextColor="#aaa"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.createButton} onPress={createChat}>
        <Text style={styles.createButtonText}>Utwórz</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 50, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  backButton: { color: '#AA00FF', fontSize: 24 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  typeSelector: { flexDirection: 'row', marginBottom: 20 },
  typeButton: { flex: 1, padding: 15, borderWidth: 1, borderColor: '#AA00FF', borderRadius: 10, marginHorizontal: 5, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#AA00FF' },
  typeText: { color: '#AA00FF', fontSize: 16 },
  typeTextActive: { color: '#fff' },
  input: { backgroundColor: '#1a1a1a', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#AA00FF' },
  createButton: { backgroundColor: '#AA00FF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});