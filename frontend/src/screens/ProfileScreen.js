import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, Switch, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [cameraPreference, setCameraPreference] = useState(user.camera_preference || 'front');
  const [showPassword, setShowPassword] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Brak uprawnień', 'Potrzebujemy dostępu do galerii');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg'
      });
      try {
        const res = await api.post(`/users/${user.id}/avatar`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        user.avatar = res.data.avatar;
        Alert.alert('Sukces', 'Awatar zmieniony');
      } catch (error) {
        Alert.alert('Błąd', 'Nie udało się zmienić awatara');
      }
    }
  };

  const saveProfile = async () => {
    try {
      await api.put(`/users/${user.id}`, {
        display_name: displayName,
        camera_preference: cameraPreference
      });
      user.display_name = displayName;
      user.camera_preference = cameraPreference;
      Alert.alert('Sukces', 'Profil zaktualizowany');
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się zapisać');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
        <Image source={{ uri: user.avatar ? `http://192.168.1.100:3000${user.avatar}` : 'https://via.placeholder.com/100' }} style={styles.avatar} />
        <Text style={styles.changePhoto}>Zmień zdjęcie</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.section} onPress={() => navigation.navigate('AttachedChats')}>
        <Text style={styles.sectionTitle}>Kanał/Grupa</Text>
        <Text style={styles.sectionValue}>{user.attached_chat_id ? 'Przypięty' : 'Brak'}</Text>
      </TouchableOpacity>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{user.username}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Imię</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Twoje imię"
          placeholderTextColor="#aaa"
        />
      </View>
      <TouchableOpacity style={styles.infoRow} onPress={() => setShowPassword(!showPassword)}>
        <Text style={styles.label}>Hasło</Text>
        <Text style={styles.value}>{showPassword ? user.password : '••••••'}</Text>
      </TouchableOpacity>
      <View style={styles.infoRow}>
        <Text style={styles.label}>Aparat do kółek</Text>
        <Switch
          value={cameraPreference === 'back'}
          onValueChange={(val) => setCameraPreference(val ? 'back' : 'front')}
          trackColor={{ false: '#767577', true: '#AA00FF' }}
          thumbColor={cameraPreference === 'back' ? '#fff' : '#f4f3f4'}
        />
        <Text style={styles.switchLabel}>{cameraPreference === 'front' ? 'Przedni' : 'Tylny'}</Text>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
        <Text style={styles.saveButtonText}>Zapisz</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Wyloguj</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 50 },
  avatarContainer: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#AA00FF' },
  changePhoto: { color: '#AA00FF', marginTop: 10 },
  section: { backgroundColor: '#1a1a1a', padding: 15, borderRadius: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: '#fff', fontSize: 16 },
  sectionValue: { color: '#AA00FF' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  label: { color: '#fff', fontSize: 16 },
  value: { color: '#aaa', fontSize: 16 },
  input: { color: '#fff', fontSize: 16, flex: 1, textAlign: 'right' },
  switchLabel: { color: '#fff', marginLeft: 10 },
  saveButton: { backgroundColor: '#AA00FF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  logoutButtonText: { color: '#fff' }
});