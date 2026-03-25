import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

export default function MessageBubble({ message, userId, onLongPress, onReaction }) {
  const isMyMessage = message.sender_id === userId;
  const [showReactions, setShowReactions] = React.useState(false);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
    }
  };

  const handleReactionSelect = (reaction) => {
    if (onReaction) {
      onReaction(reaction);
    }
    setShowReactions(false);
  };

  return (
    <View style={[styles.container, isMyMessage && styles.myContainer]}>
      <TouchableOpacity
        style={styles.bubble}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        {/* Reply preview */}
        {message.reply_to && (
          <View style={styles.replyPreview}>
            <Text style={styles.replyText}>Odpowiedź na wiadomość</Text>
          </View>
        )}

        {/* Message content */}
        {message.type === 'text' && (
          <Text style={styles.text}>{message.content}</Text>
        )}

        {/* File attachments */}
        {message.files && message.files.length > 0 && (
          <View style={styles.filesContainer}>
            {message.files.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                {file.type && file.type.startsWith('image/') ? (
                  <Image 
                    source={{ uri: `http://192.168.1.100:3000${file.path}` }} 
                    style={styles.image} 
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.fileIcon}>
                    <Text style={styles.fileIconText}>📄</Text>
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Reactions display */}
        {message.reactions && message.reactions.length > 0 && (
          <View style={styles.reactionsDisplay}>
            {message.reactions.map((reaction, index) => (
              <Text key={index} style={styles.reactionEmoji}>{reaction.reaction}</Text>
            ))}
          </View>
        )}

        {/* Timestamp */}
        <Text style={styles.time}>
          {formatTime(message.created_at)}
          {message.updated_at && ' (edytowano)'}
        </Text>

        {/* Reaction picker */}
        {showReactions && (
          <View style={styles.reactionPicker}>
            {REACTIONS.map((reaction, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => handleReactionSelect(reaction)}
                style={styles.reactionOption}
              >
                <Text style={styles.reactionEmojiOption}>{reaction}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* Add reaction button */}
      <TouchableOpacity 
        style={styles.addReactionButton}
        onPress={() => setShowReactions(!showReactions)}
      >
        <Text style={styles.addReactionText}>😊</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myContainer: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
  },
  myBubble: {
    backgroundColor: '#AA00FF',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  replyPreview: {
    borderLeftWidth: 2,
    borderLeftColor: '#AA00FF',
    paddingLeft: 10,
    marginBottom: 8,
  },
  replyText: {
    color: '#aaa',
    fontSize: 12,
  },
  filesContainer: {
    marginTop: 8,
  },
  fileItem: {
    marginBottom: 5,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 10,
  },
  fileIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
  },
  fileIconText: {
    fontSize: 20,
    marginRight: 10,
  },
  fileName: {
    color: '#fff',
    flex: 1,
  },
  reactionsDisplay: {
    flexDirection: 'row',
    marginTop: 5,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 3,
  },
  time: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 5,
    textAlign: 'right',
  },
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 5,
    marginTop: 10,
  },
  reactionOption: {
    padding: 5,
  },
  reactionEmojiOption: {
    fontSize: 20,
  },
  addReactionButton: {
    marginLeft: 5,
    padding: 5,
  },
  addReactionText: {
    fontSize: 20,
  }
});