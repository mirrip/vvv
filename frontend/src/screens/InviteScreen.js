import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function InviteScreen({ route, navigation }) {
  const { chatId } = route.params;
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Get all users except current user
      const res = await api.get('/users');
      setUsers(res.data.filter(u => u.id !== user.id));
    } catch (error) {
      console.error(error);
    }
  };

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const inviteUsers = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Info', 'Wybierz użytkowników do zaproszenia');
      return;
    }

    try {
      await api.post(`/chats/${chatId}/participants`, {
        userIds: selectedUsers
      });
      Alert.alert('Sukces', 'Zaproszono użytkowników');
      navigation.navigate('Chats');
    } catch (error) {
      console.error(error);
      Alert.alert('Błąd', 'Nie udało się zaprosić użytkowników');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => toggleUser(item.id)}
    >
      <View style={styles.checkbox}>
        {selectedUsers.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.username}>{item.username}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Zaproś użytkowników</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
      />

      <TouchableOpacity style={styles.inviteButton} onPress={inviteUsers}>
        <Text style={styles.inviteButtonText}>Zaproś ({selectedUsers.length})</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  backButton: { color: '#AA00FF', fontSize: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  checkbox: { width: 24, height: 24, borderWidth: 1, borderColor: '#AA00FF', borderRadius: 12, marginRight: 15, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#AA00FF', fontSize: 16 },
  username: { color: '#fff', fontSize: 16 },
  inviteButton: { backgroundColor: '#AA00FF', padding: 15, margin: 15, borderRadius: 10, alignItems: 'center' },
  inviteButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});