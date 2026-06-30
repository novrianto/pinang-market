const express = require('express');
const router = express.Router();
const { authAdmin } = require('../middleware/auth');
const {
  semuaPost, approvePost, rejectPost, hapusPost,
  semuaUser, statistik, notifikasi
} = require('../controllers/adminController');

router.get('/statistik', authAdmin, statistik);
router.get('/posts', authAdmin, semuaPost);
router.put('/posts/:id/approve', authAdmin, approvePost);
router.put('/posts/:id/reject', authAdmin, rejectPost);
router.delete('/posts/:id', authAdmin, hapusPost);
router.get('/users', authAdmin, semuaUser);
router.get('/notifikasi', authAdmin, notifikasi);

module.exports = router;