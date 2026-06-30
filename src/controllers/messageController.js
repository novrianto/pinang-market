const db = require('../database');

// Ambil daftar semua user yang pernah chat dengan kita
function getDaftarChat(req, res) {
  const userId = req.user.id;
  const daftar = db.prepare(`
    SELECT DISTINCT
      u.id, u.nama, u.role,
      m.isi as pesan_terakhir,
      m.created_at,
      (SELECT COUNT(*) FROM messages
       WHERE receiver_id = ? AND sender_id = u.id AND dibaca = 0) as belum_dibaca
    FROM messages m
    JOIN users u ON (
      CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END = u.id
    )
    WHERE m.sender_id = ? OR m.receiver_id = ?
    GROUP BY u.id
    ORDER BY m.created_at DESC
  `).all(userId, userId, userId, userId);
  res.json(daftar);
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