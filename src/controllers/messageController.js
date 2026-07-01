const db = require('../database');

// Ambil daftar semua user yang pernah chat dengan kita (dari messages dan chat_threads)
function getDaftarChat(req, res) {
  const userId = req.user.id;
  
  try {
    // Simple approach: get all users involved in messages or chat_threads
    const daftar = db.prepare(`
      SELECT DISTINCT
        u.id, u.nama, u.role,
        COALESCE(
          (SELECT isi FROM messages 
           WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
           ORDER BY created_at DESC LIMIT 1),
          '[Chat dimulai]'
        ) as pesan_terakhir,
        COALESCE(
          (SELECT MAX(created_at) FROM messages 
           WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)),
          (SELECT MAX(created_at) FROM chat_threads 
           WHERE (user1_id = u.id AND user2_id = ?) OR (user1_id = ? AND user2_id = u.id))
        ) as created_at,
        COALESCE((SELECT COUNT(*) FROM messages
                 WHERE receiver_id = ? AND sender_id = u.id AND dibaca = 0), 0) as belum_dibaca
      FROM users u
      WHERE u.id != ? AND (
        EXISTS (SELECT 1 FROM messages 
                WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id))
        OR EXISTS (SELECT 1 FROM chat_threads 
                  WHERE (user1_id = u.id AND user2_id = ?) OR (user1_id = ? AND user2_id = u.id))
      )
      ORDER BY created_at DESC
    `).all(userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId);
    
    res.json(daftar || []);
  } catch (err) {
    console.error('Error getDaftarChat:', err);
    res.status(500).json({ error: err.message });
  }
}

// Ambil semua pesan antara 2 user
function getRiwayatChat(req, res) {
  const userId = req.user.id;
  const lawanId = parseInt(req.params.lawanId);

  // Tandai pesan sebagai sudah dibaca
  db.prepare(`
    UPDATE messages SET dibaca = 1
    WHERE receiver_id = ? AND sender_id = ?
  `).run(userId, lawanId);

  const pesan = db.prepare(`
    SELECT m.*, u.nama as nama_sender
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `).all(userId, lawanId, lawanId, userId);

  res.json(pesan);
}

// Kirim pesan baru
function kirimPesan(req, res) {
  const { receiver_id, isi } = req.body;
  const sender_id = req.user.id;

  if (!isi || !isi.trim())
    return res.status(400).json({ error: 'Pesan tidak boleh kosong' });

  if (!receiver_id)
    return res.status(400).json({ error: 'Penerima tidak valid' });

  const result = db.prepare(`
    INSERT INTO messages (sender_id, receiver_id, isi)
    VALUES (?, ?, ?)
  `).run(sender_id, parseInt(receiver_id), isi.trim());

  const pesan = db.prepare(`
    SELECT m.*, u.nama as nama_sender
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  res.json(pesan);
}

// Ambil semua user (untuk mulai chat baru)
function getDaftarUser(req, res) {
  const users = db.prepare(`
    SELECT id, nama, role FROM users
    WHERE id != ?
    ORDER BY role DESC, nama ASC
  `).all(req.user.id);
  res.json(users);
}

module.exports = { getDaftarChat, getRiwayatChat, kirimPesan, getDaftarUser };