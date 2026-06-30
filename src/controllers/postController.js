const db = require('../database');
const path = require('path');
const fs = require('fs');

// Ambil semua postingan yang sudah approved (untuk halaman home)
function getAllPosts(req, res) {
  const { search, kategori } = req.query;
  let query = `
    SELECT posts.*, users.nama as nama_penjual
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.status = 'approved'
  `;
  const params = [];

  if (search) {
    query += ` AND (posts.judul LIKE ? OR posts.deskripsi LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (kategori && kategori !== 'semua') {
    query += ` AND posts.kategori = ?`;
    params.push(kategori);
  }

  query += ` ORDER BY posts.created_at DESC`;

  const posts = db.prepare(query).all(...params);
  res.json(posts);
}

// Ambil postingan milik user yang login
function getMyPosts(req, res) {
  const posts = db.prepare(`
    SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(posts);
}

// Detail satu postingan
function getPostById(req, res) {
  const post = db.prepare(`
    SELECT posts.*, users.nama as nama_penjual, users.id as penjual_id
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.id = ?
  `).get(req.params.id);

  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });
  res.json(post);
}

// Upload postingan baru
function createPost(req, res) {
  const { judul, deskripsi, harga, kategori } = req.body;

  if (!judul || !deskripsi || !harga || !kategori)
    return res.status(400).json({ error: 'Semua field wajib diisi' });

  const foto = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.prepare(`
    INSERT INTO posts (user_id, judul, deskripsi, harga, kategori, foto, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(req.user.id, judul, deskripsi, parseInt(harga), kategori, foto);

  // Kirim notifikasi ke admin
  const admins = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all();
  admins.forEach(admin => {
    db.prepare(`
      INSERT INTO notifications (user_id, pesan)
      VALUES (?, ?)
    `).run(admin.id, `Postingan baru menunggu review: "${judul}"`);
  });

  res.json({ message: 'Postingan berhasil dikirim, menunggu persetujuan admin', id: result.lastInsertRowid });
}

// Hapus postingan (hanya milik sendiri)
function deletePost(req, res) {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

  // Hapus foto kalau ada
  if (post.foto) {
    const fotoPath = path.join(__dirname, '../../public', post.foto);
    if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Postingan berhasil dihapus' });
}

module.exports = { getAllPosts, getMyPosts, getPostById, createPost, deletePost };