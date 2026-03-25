import React, { useState, useEffect } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function ProfileViewScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [media, setMedia] = useState([]);
  const [activeTab, setActiveTab] = useState('media');

  useEffect(() => {
    fetchProfile();
    fetchMedia();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/users/${userId}`);
      setProfileUser(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMedia = async () => {
    try {
      // Fetch messages with media for this user
      const res = await api.get(`/users/${userId}/media`);
      setMedia(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const startChat = async () => {
    try {
      // Create or find existing dialog
      const res = await api.post('/chats', {
        type: 'dialog',
        title: profileUser.username,
        username: `dialog_${currentUser.id}_${userId}`,
        created_by: currentUser.id
      });
      navigation.navigate('Chat', { chat: res.data.chat });
    } catch (error) {
      console.error(error);
    }
  };

  if (!profileUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Ładowanie...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.profileHeader}>
        <Image 
          source={{ uri: profileUser.avatar ? `http://192.168.1.100:3000${profileUser.avatar}` : 'https://via.placeholder.com/100' }} 
          style={styles.avatar} 
        />
        <Text style={styles.username}>{profileUser.username}</Text>
        <Text style={styles.displayName}>{profileUser.display_name || 'Brak nazwy'}</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'media' && styles.activeTab]}
          onPress={() => setActiveTab('media')}
        >
          <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>Media</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'files' && styles.activeTab]}
          onPress={() => setActiveTab('files')}
        >
          <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>Pliki</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'links' && styles.activeTab]}
          onPress={() => setActiveTab('links')}
        >
          <Text style={[styles.tabText, activeTab === 'links' && styles.activeTabText]}>Linki</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={media}
        numColumns={3}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.mediaItem}>
            {item.type === 'photo' && (
              <Image 
                source={{ uri: item.files?.[0]?.path ? `http://192.168.1.100:3000${item.files[0].path}` : 'https://via.placeholder.com/100' }} 
                style={styles.mediaImage} 
              />
            )}
            {item.type === 'video' && (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoIcon}>▶</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Brak elementów</Text>}
      />

      {userId !== currentUser.id && (
        <TouchableOpacity style={styles.chatButton} onPress={startChat}>
          <Text style={styles.chatButtonText}>Napisz wiadomość</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 50 },
  loading: { color: '#fff', textAlign: 'center', marginTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  backButton: { color: '#AA00FF', fontSize: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  profileHeader: { alignItems: 'center', padding: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#AA00FF', marginBottom: 15 },
  username: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  displayName: { color: '#aaa', fontSize: 16, marginTop: 5 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  tab: { flex: 1, padding: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#AA00FF' },
  tabText: { color: '#aaa', fontSize: 14 },
  activeTabText: { color: '#AA00FF' },
  mediaItem: { flex: 1/3, aspectRatio: 1, padding: 2 },
  mediaImage: { width: '100%', height: '100%' },
  videoPlaceholder: { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  videoIcon: { color: '#AA00FF', fontSize: 30 },
  emptyText: { color: '#aaa', textAlign: 'center', marginTop: 50 },
  chatButton: { backgroundColor: '#AA00FF', padding: 15, margin: 15, borderRadius: 10, alignItems: 'center' },
  chatButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});