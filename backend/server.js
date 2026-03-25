const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Konfiguracja multer dla uploadów
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage });

// Utwórz katalog uploads jeśli nie istnieje
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// --------------------------------------------------------------
// Endpointy REST
// --------------------------------------------------------------

// Rejestracja / logowanie
app.post('/auth', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (user) {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        res.json({ user, isNew: false });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      const hashed = await bcrypt.hash(password, 10);
      db.run('INSERT INTO users (username, password, display_name, avatar) VALUES (?, ?, ?, ?)',
        [username, hashed, '', ''], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ user: newUser, isNew: true });
          });
        });
    }
  });
});

// Pobierz użytkownika po id
app.get('/users/:id', (req, res) => {
  db.get('SELECT id, username, display_name, avatar, attached_chat_id, camera_preference FROM users WHERE id = ?',
    [req.params.id], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    });
});

// Aktualizacja profilu
app.put('/users/:id', (req, res) => {
  const { display_name, attached_chat_id, camera_preference } = req.body;
  db.run('UPDATE users SET display_name = ?, attached_chat_id = ?, camera_preference = ? WHERE id = ?',
    [display_name || '', attached_chat_id || null, camera_preference || 'front', req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
});

// Upload avatara
app.post('/users/:id/avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const avatarPath = `/uploads/${req.file.filename}`;
  db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ avatar: avatarPath });
  });
});

// Pobierz listę czatów użytkownika
app.get('/users/:id/chats', (req, res) => {
  const userId = req.params.id;
  // Dialogi: znajdź wszystkich użytkowników, z którymi użytkownik wymieniał wiadomości
  // Dla uproszczenia: pobierz wszystkie czaty, w których użytkownik uczestniczy
  const sql = `
    SELECT DISTINCT c.*,
      CASE 
        WHEN c.type = 'dialog' THEN (
          SELECT u2.username FROM users u2 WHERE u2.id IN (
            SELECT user_id FROM participants WHERE chat_id = c.id AND user_id != ?
          )
        )
        ELSE c.title
      END AS title,
      (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND created_at > (
        SELECT COALESCE(MAX(created_at), 0) FROM messages WHERE chat_id = c.id AND sender_id = ? AND type = 'read_marker'
      )) as unread_count
    FROM chats c
    JOIN participants p ON p.chat_id = c.id
    WHERE p.user_id = ?
  `;
  db.all(sql, [userId, userId, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Utworzenie grupy/kanału
app.post('/chats', (req, res) => {
  const { type, title, username, avatar, created_by } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  // Sprawdź unikalność
  db.get('SELECT id FROM chats WHERE username = ?', [username], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) return res.status(409).json({ error: 'Username taken' });
    const created_at = Date.now();
    db.run('INSERT INTO chats (type, title, username, avatar, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [type, title || username, username, avatar || '', created_by, created_at],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const chatId = this.lastID;
        // Dodaj twórcę jako uczestnika z rolą creator
        db.run('INSERT INTO participants (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
          [chatId, created_by, 'creator', created_at], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ chatId, chat: { id: chatId, type, title, username, avatar, created_by, created_at } });
          });
      });
  });
});

// Dodanie uczestników do grupy/kanału (przy zaproszeniach)
app.post('/chats/:chatId/participants', (req, res) => {
  const { chatId } = req.params;
  const { userIds } = req.body;
  const joined_at = Date.now();
  const stmt = db.prepare('INSERT OR IGNORE INTO participants (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)');
  userIds.forEach(uid => {
    stmt.run(chatId, uid, 'member', joined_at);
  });
  stmt.finalize(err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Pobierz wiadomości dla czatu
app.get('/chats/:chatId/messages', (req, res) => {
  const { chatId } = req.params;
  const { limit = 50, before } = req.query;
  let sql = 'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT ?';
  let params = [chatId, limit];
  if (before) {
    sql = 'SELECT * FROM messages WHERE chat_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?';
    params = [chatId, before, limit];
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Dla każdej wiadomości dołącz pliki i reakcje
    const promises = rows.map(msg => {
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM files WHERE message_id = ?', [msg.id], (err, files) => {
          if (err) reject(err);
          db.all('SELECT * FROM reactions WHERE message_id = ?', [msg.id], (err, reactions) => {
            if (err) reject(err);
            db.all('SELECT user_id FROM message_reads WHERE message_id = ?', [msg.id], (err, reads) => {
              if (err) reject(err);
              msg.files = files;
              msg.reactions = reactions;
              msg.reads = reads.map(r => r.user_id);
              resolve(msg);
            });
          });
        });
      });
    });
    Promise.all(promises).then(messages => {
      res.json(messages.reverse()); // w kolejności rosnącej
    }).catch(err => res.status(500).json({ error: err.message }));
  });
});

// Wysyłanie wiadomości
app.post('/messages', upload.array('files'), (req, res) => {
  const { chat_id, sender_id, type, content, reply_to } = req.body;
  const created_at = Date.now();
  db.run('INSERT INTO messages (chat_id, sender_id, type, content, reply_to, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [chat_id, sender_id, type, content, reply_to, created_at],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const messageId = this.lastID;
      // Zapisz pliki jeśli przesłane
      if (req.files && req.files.length) {
        const stmt = db.prepare('INSERT INTO files (message_id, path, type, size, name) VALUES (?, ?, ?, ?, ?)');
        req.files.forEach(file => {
          const ext = path.extname(file.originalname);
          const mimeType = file.mimetype;
          stmt.run(messageId, `/uploads/${file.filename}`, mimeType, file.size, file.originalname);
        });
        stmt.finalize();
      }
      // Pobierz pełną wiadomość z plikami
      db.get('SELECT * FROM messages WHERE id = ?', [messageId], (err, msg) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all('SELECT * FROM files WHERE message_id = ?', [messageId], (err, files) => {
          msg.files = files;
          // Emituj przez socket
          io.to(`chat_${chat_id}`).emit('new_message', msg);
          res.json(msg);
        });
      });
    });
});

// Oznacz wiadomość jako przeczytaną
app.post('/messages/:messageId/read', (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body;
  const { chat_id } = req.body;
  db.run('INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)', [messageId, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    // Powiadom przez socket
    io.to(`chat_${chat_id}`).emit('message_read', { messageId, userId });
    res.json({ success: true });
  });
});

// Dodaj reakcję
app.post('/messages/:messageId/reactions', (req, res) => {
  const { messageId } = req.params;
  const { userId, reaction } = req.body;
  const { chat_id } = req.body;
  db.run('INSERT OR REPLACE INTO reactions (message_id, user_id, reaction) VALUES (?, ?, ?)',
    [messageId, userId, reaction], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      io.to(`chat_${chat_id}`).emit('reaction_update', { messageId, userId, reaction });
      res.json({ success: true });
    });
});

// Edytuj wiadomość (tylko tekst)
app.put('/messages/:messageId', (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const updated_at = Date.now();
  db.run('UPDATE messages SET content = ?, updated_at = ? WHERE id = ?', [content, updated_at, messageId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM messages WHERE id = ?', [messageId], (err, msg) => {
      io.to(`chat_${msg.chat_id}`).emit('message_updated', msg);
      res.json(msg);
    });
  });
});

// Usuń wiadomość
app.delete('/messages/:messageId', (req, res) => {
  const { messageId } = req.params;
  db.get('SELECT chat_id FROM messages WHERE id = ?', [messageId], (err, msg) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM messages WHERE id = ?', [messageId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      io.to(`chat_${msg.chat_id}`).emit('message_deleted', messageId);
      res.json({ success: true });
    });
  });
});

// --------------------------------------------------------------
// Socket.IO
// --------------------------------------------------------------
io.on('connection', (socket) => {
  const { userId } = socket.handshake.query;
  if (userId) {
    socket.join(`user_${userId}`);
    // Pobierz wszystkie czaty użytkownika i dołącz do ich pokoi
    db.all('SELECT chat_id FROM participants WHERE user_id = ?', [userId], (err, rows) => {
      rows.forEach(row => socket.join(`chat_${row.chat_id}`));
    });
  }

  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
  });

  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat_${chatId}`);
  });

  socket.on('typing', ({ chatId, userId }) => {
    socket.to(`chat_${chatId}`).emit('typing', { userId });
  });

  socket.on('stop_typing', ({ chatId, userId }) => {
    socket.to(`chat_${chatId}`).emit('stop_typing', { userId });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});