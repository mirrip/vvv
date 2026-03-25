import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, TextInput, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { socket, connectSocket } from '../utils/socket';

export default function ChatsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchChats();
    connectSocket(user.id);
    socket.on('new_message', (msg) => {
      fetchChats(); // odśwież listę czatów
    });
    return () => {
      socket.off('new_message');
    };
  }, []);

  const fetchChats = async () => {
    try {
      const res = await api.get(`/users/${user.id}/chats`);
      setChats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const search = async (text) => {
    setSearchQuery(text);
    if (text.length === 0) {
      setSearchResults([]);
      return;
    }
    try {
      // endpoint wyszukiwania (powinien być zaimplementowany na backendzie)
      const res = await api.get(`/search?q=${encodeURIComponent(text)}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLongPress = (chat) => {
    Alert.alert(
      'Akcje',
      '',
      [
        { text: chat.pinned ? 'Odepnij' : 'Przypnij', onPress: () => togglePin(chat) },
        { text: chat.muted ? 'Włącz dźwięk' : 'Wycisz', onPress: () => toggleMute(chat) },
        { text: 'Wyczyść czat', onPress: () => clearChat(chat) },
        { text: 'Zablokuj', onPress: () => blockUser(chat), style: 'destructive' },
        { text: 'Anuluj', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  const togglePin = async (chat) => {
    // implementacja
  };

  const toggleMute = async (chat) => {
    // implementacja
  };

  const clearChat = async (chat) => {
    // implementacja
  };

  const blockUser = async (chat) => {
    // implementacja
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('Chat', { chat: item })}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      <Image source={{ uri: item.avatar ? `http://192.168.1.100:3000${item.avatar}` : 'https://via.placeholder.com/50' }} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.title}</Text>
        <Text style={styles.lastMessage}>{item.last_message}</Text>
      </View>
      {item.unread_count > 0 && !item.muted && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Image source={{ uri: user.avatar ? `http://192.168.1.100:3000${user.avatar}` : 'https://via.placeholder.com/50' }} style={styles.headerAvatar} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('CreateChat')}>
          <Text style={styles.editButton}>Edytuj</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Szukaj..."
        placeholderTextColor="#aaa"
        value={searchQuery}
        onChangeText={search}
      />
      <FlatList
        data={searchQuery ? searchResults : chats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 15 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#AA00FF' },
  editButton: { color: '#AA00FF', fontSize: 16 },
  searchInput: { backgroundColor: '#1a1a1a', color: '#fff', padding: 10, borderRadius: 20, marginHorizontal: 15, marginBottom: 10, borderWidth: 1, borderColor: '#AA00FF' },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  chatInfo: { flex: 1 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  lastMessage: { color: '#aaa', fontSize: 12 },
  badge: { backgroundColor: '#AA00FF', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 10 },
  badgeText: { color: '#fff', fontSize: 12 }
});