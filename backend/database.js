const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database(path.join(__dirname, 'v.db'));

db.serialize(() => {
  // users
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    display_name TEXT,
    avatar TEXT,
    attached_chat_id INTEGER,
    camera_preference TEXT DEFAULT 'front'
  )`);

  // chats (dialogs, groups, channels)
  db.run(`CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT, -- 'dialog', 'group', 'channel'
    title TEXT,
    username TEXT UNIQUE,
    avatar TEXT,
    created_by INTEGER,
    created_at INTEGER
  )`);

  // participants (for groups and channels)
  db.run(`CREATE TABLE IF NOT EXISTS participants (
    chat_id INTEGER,
    user_id INTEGER,
    role TEXT, -- 'member', 'admin', 'creator'
    muted INTEGER DEFAULT 0,
    joined_at INTEGER,
    PRIMARY KEY (chat_id, user_id)
  )`);

  // messages
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    sender_id INTEGER, -- user_id or chat_id for channel posts
    type TEXT, -- 'text', 'photo', 'video', 'file', 'voice', 'video_message'
    content TEXT,
    reply_to INTEGER,
    created_at INTEGER,
    updated_at INTEGER
  )`);

  // reactions
  db.run(`CREATE TABLE IF NOT EXISTS reactions (
    message_id INTEGER,
    user_id INTEGER,
    reaction TEXT,
    PRIMARY KEY (message_id, user_id)
  )`);

  // message read status
  db.run(`CREATE TABLE IF NOT EXISTS message_reads (
    message_id INTEGER,
    user_id INTEGER,
    PRIMARY KEY (message_id, user_id)
  )`);

  // files metadata
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER,
    path TEXT,
    type TEXT,
    size INTEGER,
    name TEXT
  )`);
});

module.exports = db;