const db = require('../database');

// Ambil semua postingan (semua status)
function semuaPost(req, res) {
  const { status } = req.query;
  let query = `
    SELECT posts.*, users.nama as nama_penjual, users.email as email_penjual
    FROM posts
    JOIN users ON posts.user_id = users.id
  `;
  if (status && status !== 'semua') {
    query += ` WHERE posts.status = '${status}'`;
  }
  query += ` ORDER BY posts.created_at DESC`;
  const posts = db.prepare(query).all();
  res.json(posts);
}

// Approve postingan
function approvePost(req, res) {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

  db.prepare(`UPDATE posts SET status = 'approved' WHERE id = ?`).run(req.params.id);

  // Notifikasi ke pemilik post
  db.prepare(`INSERT INTO notifications (user_id, pesan) VALUES (?, ?)`)
    .run(post.user_id, `✅ Postingan "${post.judul}" telah disetujui dan sekarang tampil di marketplace!`);

  res.json({ message: 'Postingan disetujui' });
}

// Reject postingan
function rejectPost(req, res) {
  const { alasan } = req.body;
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

  db.prepare(`UPDATE posts SET status = 'rejected', alasan_reject = ? WHERE id = ?`)
    .run(alasan || 'Tidak memenuhi ketentuan', req.params.id);

  // Notifikasi ke pemilik post
  db.prepare(`INSERT INTO notifications (user_id, pesan) VALUES (?, ?)`)
    .run(post.user_id, `❌ Postingan "${post.judul}" ditolak. Alasan: ${alasan || 'Tidak memenuhi ketentuan'}`);

  res.json({ message: 'Postingan ditolak' });
}

// Hapus postingan (oleh admin)
function hapusPost(req, res) {
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Postingan dihapus' });
}

// Ambil semua user
function semuaUser(req, res) {
  const users = db.prepare(`
    SELECT id, nama, email, role, created_at FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
}

// Statistik dashboard
function statistik(req, res) {
  const totalUser = db.prepare(`SELECT COUNT(*) as total FROM users WHERE role = 'user'`).get();
  const totalPost = db.prepare(`SELECT COUNT(*) as total FROM posts`).get();
  const pending = db.prepare(`SELECT COUNT(*) as total FROM posts WHERE status = 'pending'`).get();
  const approved = db.prepare(`SELECT COUNT(*) as total FROM posts WHERE status = 'approved'`).get();
  const rejected = db.prepare(`SELECT COUNT(*) as total FROM posts WHERE status = 'rejected'`).get();

  res.json({
    totalUser: totalUser.total,
    totalPost: totalPost.total,
    pending: pending.total,
    approved: approved.total,
    rejected: rejected.total
  });
}

// Ambil notifikasi admin
function notifikasi(req, res) {
  const notifs = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.user.id);
  res.json(notifs);
}

module.exports = { semuaPost, approvePost, rejectPost, hapusPost, semuaUser, statistik, notifikasi };